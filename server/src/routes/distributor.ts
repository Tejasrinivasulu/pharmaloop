import { Router } from 'express';
import { requireAuth, requireRoles, type AuthedRequest } from '../middleware.js';
import { getStore } from '../store.js';
import {
  appendAudit,
  appendTimeline,
  applyExpiredNotForSale,
  detectDiscrepancy,
  enrichReturn,
  pushNotification,
  transferStock,
} from '../rules.js';
import { nextId, type Manifest } from '../types.js';

const router = Router();
router.use(requireAuth, requireRoles('Distributor'));

router.get('/dashboard', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const orgId = req.user!.orgId;
  const returns = store.returns.filter((r) => r.distributorOrgId === orgId);
  const manifests = store.manifests.filter((m) => m.distributorOrgId === orgId);
  const inventory = store.inventory.filter((i) => i.orgId === orgId);

  res.json({
    org: store.organizations.find((o) => o.id === orgId),
    kpis: {
      pendingVerification: returns.filter((r) => r.status === 'RETURN_REQUESTED').length,
      verifiedAwaitingPickup: returns.filter(
        (r) => r.status === 'DISTRIBUTOR_VERIFIED' && !r.pickedUpAt && !r.closed,
      ).length,
      stagedForConsolidate: returns.filter(
        (r) => r.status === 'DISTRIBUTOR_VERIFIED' && !!r.pickedUpAt && !r.manifestId && !r.closed,
      ).length,
      inTransitManifests: manifests.filter((m) => m.status === 'IN_TRANSIT' || m.status === 'DRAFT').length,
      deliveredManifests: manifests.filter((m) => m.status === 'DELIVERED').length,
      totalReturnUnits: returns.reduce((s, r) => s + r.quantities.requested, 0),
      warehouseSkus: inventory.length,
      notForSaleUnits: inventory.filter((i) => i.notForSale).reduce((s, i) => s + i.qty, 0),
    },
    recentReturns: returns
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((r) => enrichReturn(r, store)),
    manifests: manifests.slice(0, 5),
  });
});

router.get('/returns', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const returns = store.returns
    .filter((r) => r.distributorOrgId === req.user!.orgId)
    .map((r) => enrichReturn(r, store));
  res.json({ returns, count: returns.length });
});

router.post('/verify', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, verifiedQty, note } = req.body as {
    returnId?: string;
    verifiedQty?: number;
    note?: string;
  };

  if (!returnId || verifiedQty == null || verifiedQty < 0) {
    res.status(400).json({ error: 'returnId and verifiedQty are required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return — closed records are never deleted or altered' });
    return;
  }
  if (ret.status !== 'RETURN_REQUESTED') {
    res.status(409).json({ error: `Expected RETURN_REQUESTED, got ${ret.status}` });
    return;
  }

  const disc = detectDiscrepancy(ret.quantities.requested, verifiedQty);
  ret.quantities.verified = verifiedQty;
  ret.expectedQty = verifiedQty;
  ret.discrepancy = disc.discrepancy;
  ret.discrepancyNote = disc.note || (note?.trim() ? note.trim() : undefined);
  if (!disc.discrepancy && note?.trim()) {
    ret.discrepancyNote = note.trim();
  }
  ret.status = 'DISTRIBUTOR_VERIFIED';

  if (disc.discrepancy) {
    store.alerts.unshift({
      id: nextId(store, 'alert'),
      type: 'DISCREPANCY',
      severity: 'warning',
      title: `Pickup discrepancy — ${ret.batchNumber}`,
      message: disc.note!,
      batchNumber: ret.batchNumber,
      returnId: ret.id,
      orgId: req.user!.orgId,
      orgName: req.user!.org,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    });
  }

  appendTimeline(
    store,
    ret,
    'DISTRIBUTOR_VERIFIED',
    req.user!,
    note || disc.note || `Verified ${verifiedQty} units at pickup`,
  );
  appendAudit(store, req.user!, 'RETURN_VERIFY', 'Return', ret.id, disc.note || `Verified qty ${verifiedQty}`);

  pushNotification(store, {
    role: 'Pharmacy',
    title: `Return verified — ${ret.returnCode}`,
    body: disc.discrepancy
      ? `${req.user!.org} verified ${verifiedQty} units with discrepancy: ${disc.note}`
      : `${req.user!.org} verified ${verifiedQty} units. Ready for pickup.`,
    type: 'return',
    href: '/pharmacy/returns',
  });
  if (disc.discrepancy) {
    pushNotification(store, {
      role: 'Admin',
      title: `Discrepancy on verify — ${ret.returnCode}`,
      body: disc.note || 'Quantity mismatch at distributor verify',
      type: 'alert',
      href: '/admin/discrepancies',
    });
  }

  res.json({ return: enrichReturn(ret, store), discrepancy: disc });
});

router.post('/pickup', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnIds } = req.body as { returnIds?: string[] };

  if (!returnIds?.length) {
    res.status(400).json({ error: 'returnIds array is required' });
    return;
  }

  const now = new Date().toISOString();
  const picked = [];
  for (const id of returnIds) {
    const ret = store.returns.find((r) => r.id === id);
    if (!ret) continue;
    if (ret.closed) continue;
    if (ret.status !== 'DISTRIBUTOR_VERIFIED') continue;
    if (ret.pickedUpAt) continue;
    ret.pickedUpAt = now;
    appendTimeline(store, ret, 'PICKED_UP', req.user!, 'Pickup confirmed — staged for manufacturer consolidation');
    picked.push(enrichReturn(ret, store));
  }

  appendAudit(
    store,
    req.user!,
    'PICKUP',
    'Return',
    returnIds.join(','),
    `Pickup confirmed for ${picked.length} returns`,
  );

  if (picked.length) {
    pushNotification(store, {
      role: 'Pharmacy',
      title: `Pickup confirmed (${picked.length})`,
      body: `${req.user!.org} picked up ${picked.length} return(s) for consolidation.`,
      type: 'return',
      href: '/pharmacy/returns',
    });
  }

  res.json({ picked, count: picked.length });
});

router.post('/consolidate', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnIds, manufacturerOrgId } = req.body as {
    returnIds?: string[];
    manufacturerOrgId?: string;
  };

  if (!returnIds?.length) {
    res.status(400).json({ error: 'returnIds array is required' });
    return;
  }

  const selected = store.returns.filter((r) => returnIds.includes(r.id));
  if (!selected.length) {
    res.status(404).json({ error: 'No matching returns' });
    return;
  }

  for (const r of selected) {
    if (r.closed) {
      res.status(409).json({ error: `Cannot consolidate closed return ${r.returnCode}` });
      return;
    }
    if (r.status !== 'DISTRIBUTOR_VERIFIED') {
      res.status(409).json({ error: `${r.returnCode} must be DISTRIBUTOR_VERIFIED (got ${r.status})` });
      return;
    }
    if (r.manifestId) {
      res.status(409).json({ error: `${r.returnCode} is already on a manifest` });
      return;
    }
    if (!r.pickedUpAt) {
      res.status(409).json({ error: `${r.returnCode} must be picked up before consolidation` });
      return;
    }
  }

  const mfgId = manufacturerOrgId || selected[0].manufacturerOrgId;
  const mfg = store.organizations.find((o) => o.id === mfgId);
  const totalUnits = selected.reduce(
    (s, r) => s + (r.quantities.verified || r.quantities.requested),
    0,
  );

  const manifest: Manifest = {
    id: nextId(store, 'man'),
    manifestNo: `MAN-2026-${String(store.seq).padStart(3, '0')}`,
    distributorOrgId: req.user!.orgId,
    distributorName: req.user!.org,
    manufacturerOrgId: mfgId,
    manufacturerName: mfg?.name || selected[0].manufacturerName,
    returnIds: selected.map((r) => r.id),
    totalUnits,
    status: 'DRAFT',
    pickupAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  store.manifests.unshift(manifest);
  for (const r of selected) {
    r.manifestId = manifest.id;
    appendTimeline(
      store,
      r,
      'CONSOLIDATED',
      req.user!,
      `Added to manufacturer manifest ${manifest.manifestNo}`,
    );
  }

  appendAudit(
    store,
    req.user!,
    'CONSOLIDATE',
    'Manifest',
    manifest.id,
    `Created ${manifest.manifestNo} with ${totalUnits} units`,
  );

  pushNotification(store, {
    role: 'Manufacturer',
    title: `Manifest ready — ${manifest.manifestNo}`,
    body: `${req.user!.org} consolidated ${selected.length} return(s), ${totalUnits} units. Dispatch pending.`,
    type: 'manifest',
    href: '/manufacturer/returns',
  });

  res.status(201).json({
    manifest: {
      ...manifest,
      returns: selected.map((r) => enrichReturn(r, store)),
    },
  });
});

router.post('/manifests/:id/dispatch', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const man = store.manifests.find((m) => m.id === req.params.id && m.distributorOrgId === req.user!.orgId);
  if (!man) {
    res.status(404).json({ error: 'Manifest not found' });
    return;
  }
  if (man.status !== 'DRAFT' && man.status !== 'IN_TRANSIT') {
    res.status(409).json({ error: `Cannot dispatch manifest in status ${man.status}` });
    return;
  }
  man.status = 'IN_TRANSIT';
  man.pickupAt = man.pickupAt || new Date().toISOString();
  for (const id of man.returnIds) {
    const ret = store.returns.find((r) => r.id === id);
    if (ret && !ret.closed) {
      appendTimeline(store, ret, 'IN_TRANSIT', req.user!, `Manifest ${man.manifestNo} dispatched to manufacturer`);
    }
  }
  appendAudit(store, req.user!, 'MANIFEST_DISPATCH', 'Manifest', man.id, `Dispatched ${man.manifestNo}`);

  pushNotification(store, {
    role: 'Manufacturer',
    title: `In transit — ${man.manifestNo}`,
    body: `${man.totalUnits} units dispatched from ${req.user!.org}. Receive when arrived.`,
    type: 'manifest',
    href: '/manufacturer/returns',
  });

  res.json({
    manifest: {
      ...man,
      returns: store.returns.filter((r) => man.returnIds.includes(r.id)).map((r) => enrichReturn(r, store)),
    },
  });
});

router.get('/manifests', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const manifests = store.manifests
    .filter((m) => m.distributorOrgId === req.user!.orgId)
    .map((m) => ({
      ...m,
      returns: store.returns
        .filter((r) => m.returnIds.includes(r.id))
        .map((r) => enrichReturn(r, store)),
    }));

  res.json({ manifests, count: manifests.length });
});

router.get('/settlements', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const orgId = req.user!.orgId;
  const settlements = store.settlements
    .filter((s) => {
      const ret = store.returns.find((r) => r.id === s.returnId);
      return ret?.distributorOrgId === orgId;
    })
    .map((s) => {
      const ret = store.returns.find((r) => r.id === s.returnId);
      return {
        ...s,
        returnStatus: ret?.status ?? null,
        returnClosed: ret?.closed ?? null,
        pharmacyName: s.pharmacyName,
        manufacturerName: ret?.manufacturerName,
      };
    });

  res.json({
    settlements,
    totals: {
      pending: settlements.filter((s) => s.status === 'PENDING').reduce((a, s) => a + s.amount, 0),
      approved: settlements.filter((s) => s.status === 'APPROVED').reduce((a, s) => a + s.amount, 0),
      paid: settlements.filter((s) => s.status === 'PAID').reduce((a, s) => a + s.amount, 0),
    },
  });
});

router.get('/inventory', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const inventory = store.inventory
    .filter((i) => i.orgId === req.user!.orgId)
    .map(applyExpiredNotForSale);
  res.json({
    inventory,
    summary: {
      skus: inventory.length,
      units: inventory.reduce((s, i) => s + i.qty, 0),
      sellable: inventory.filter((i) => !i.notForSale).reduce((s, i) => s + i.qty, 0),
    },
  });
});

router.get('/pharmacies', async (_req: AuthedRequest, res) => {
  const store = await getStore();
  const pharmacies = store.organizations.filter(
    (o) => o.type === 'Pharmacy' && o.status === 'ACTIVE',
  );
  res.json({ pharmacies });
});

/** Sell distributor warehouse stock to a pharmacy */
router.post('/sell', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { batchNumber, qty, pharmacyOrgId, note } = req.body as {
    batchNumber?: string;
    qty?: number;
    pharmacyOrgId?: string;
    note?: string;
  };
  const bn = (batchNumber || '').trim();
  const n = Number(qty);
  if (!bn || !pharmacyOrgId || !Number.isFinite(n) || n <= 0) {
    res.status(400).json({ error: 'batchNumber, pharmacyOrgId, and qty (>0) are required' });
    return;
  }

  const batch = store.batches.find((b) => b.batchNumber === bn);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }

  const buyer = store.organizations.find((o) => o.id === pharmacyOrgId);
  if (!buyer || buyer.type !== 'Pharmacy') {
    res.status(400).json({ error: 'Valid pharmacy organization required' });
    return;
  }

  try {
    const { buyerItem } = transferStock(store, {
      fromOrgId: req.user!.orgId,
      toOrg: buyer,
      batchNumber: bn,
      qty: n,
      actor: req.user!,
      passportStatus: 'SOLD_TO_PHARMACY',
      note: note?.trim() || `Sold ${n} units to ${buyer.name}`,
      buyerLocation: 'Pharmacy shelf',
    });

    const phUser = store.users.find((u) => u.orgId === buyer.id);
    pushNotification(store, {
      role: 'Pharmacy',
      userId: phUser?.id,
      title: 'New stock received',
      body: `${n} units of ${batch.productName} (${bn}) from ${req.user!.org}`,
      type: 'stock',
      href: '/pharmacy/inventory',
    });
    appendAudit(
      store,
      req.user!,
      'SELL_TO_PHARMACY',
      'Batch',
      batch.id,
      `Sold ${n} of ${bn} to ${buyer.name}`,
    );

    res.json({
      ok: true,
      soldQty: n,
      batchNumber: bn,
      buyer: { id: buyer.id, name: buyer.name },
      buyerInventory: applyExpiredNotForSale(buyerItem),
      sellerInventory: store.inventory
        .filter((i) => i.orgId === req.user!.orgId)
        .map(applyExpiredNotForSale),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Sale failed' });
  }
});

export default router;
