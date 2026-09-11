import { Router } from 'express';
import { requireAuth, requireRoles, type AuthedRequest } from '../middleware.js';
import { getStore } from '../store.js';
import {
  applyExpiredNotForSale,
  applyPartialReturnToBatch,
  appendAudit,
  appendTimeline,
  deductInventoryQty,
  enrichReturn,
  isExpired,
  pushNotification,
} from '../rules.js';
import { nextId, type ReturnRecord } from '../types.js';

const router = Router();
router.use(requireAuth, requireRoles('Pharmacy'));

router.get('/dashboard', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const orgId = req.user!.orgId;
  const inventory = store.inventory
    .filter((i) => i.orgId === orgId)
    .map(applyExpiredNotForSale);
  const returns = store.returns.filter((r) => r.pharmacyOrgId === orgId);
  const settlements = store.settlements.filter((s) => s.pharmacyOrgId === orgId);
  const alerts = store.alerts.filter(
    (a) => a.orgId === orgId || returns.some((r) => r.id === a.returnId),
  );
  const notifications = store.notifications.filter(
    (n) => n.userId === req.user!.id && !n.read,
  );

  res.json({
    org: store.organizations.find((o) => o.id === orgId),
    kpis: {
      inventorySkuCount: inventory.length,
      unitsOnHand: inventory.reduce((s, i) => s + i.qty, 0),
      notForSaleUnits: inventory.filter((i) => i.notForSale).reduce((s, i) => s + i.qty, 0),
      expiredSkuCount: inventory.filter((i) => i.status === 'EXPIRED' || isExpired(i.expiryDate)).length,
      expiringSoon: inventory.filter((i) => i.status === 'EXPIRING').length,
      openReturns: returns.filter((r) => !r.closed).length,
      closedReturns: returns.filter((r) => r.closed).length,
      pendingSettlements: settlements.filter((s) => s.status === 'PENDING' || s.status === 'APPROVED').length,
      paidSettlementAmount: settlements
        .filter((s) => s.status === 'PAID')
        .reduce((s, x) => s + x.amount, 0),
      openAlerts: alerts.filter((a) => a.status === 'OPEN').length,
      unreadNotifications: notifications.length,
    },
    recentReturns: returns
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
      .map((r) => enrichReturn(r, store)),
    inventoryHighlights: inventory.slice(0, 8),
    settlements: settlements.slice(0, 5),
    alerts: alerts.slice(0, 5),
  });
});

router.get('/inventory', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const items = store.inventory
    .filter((i) => i.orgId === req.user!.orgId)
    .map(applyExpiredNotForSale)
    .map((item) => {
      const batch = store.batches.find((b) => b.batchNumber === item.batchNumber);
      return {
        ...item,
        batchStatus: batch?.status ?? null,
        batchQuantities: batch?.quantities ?? null,
        forSale: !item.notForSale && item.status === 'AVAILABLE',
      };
    });

  res.json({
    inventory: items,
    summary: {
      total: items.length,
      available: items.filter((i) => i.status === 'AVAILABLE').length,
      notForSale: items.filter((i) => i.notForSale).length,
      expired: items.filter((i) => i.status === 'EXPIRED').length,
      expiring: items.filter((i) => i.status === 'EXPIRING').length,
      discrepancy: items.filter((i) => i.status === 'DISCREPANCY').length,
    },
  });
});

router.get('/returns', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const returns = store.returns
    .filter((r) => r.pharmacyOrgId === req.user!.orgId)
    .map((r) => enrichReturn(r, store));

  res.json({ returns, count: returns.length });
});

router.post('/returns', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { batchNumber, qty, reason, unitCodes } = req.body as {
    batchNumber?: string;
    qty?: number;
    reason?: string;
    unitCodes?: string[];
  };

  if (!batchNumber || !qty || qty <= 0 || !reason) {
    res.status(400).json({ error: 'batchNumber, qty (>0), and reason are required' });
    return;
  }

  const batch = store.batches.find(
    (b) => b.batchNumber.toLowerCase() === batchNumber.toLowerCase(),
  );
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }

  const inv = store.inventory.find(
    (i) => i.orgId === req.user!.orgId && i.batchNumber === batch.batchNumber,
  );
  if (inv) {
    const locked = applyExpiredNotForSale(inv);
    if (isExpired(locked.expiryDate)) {
      locked.notForSale = true;
      locked.status = 'EXPIRED';
      locked.reason = 'Expired — NOT FOR SALE';
      Object.assign(inv, locked);
    }
  }

  const id = nextId(store, 'ret');
  const returnCode = `RET-2026-${String(store.seq).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const record: ReturnRecord = {
    id,
    returnCode,
    batchNumber: batch.batchNumber,
    productName: batch.productName,
    strength: batch.strength,
    pharmacyOrgId: req.user!.orgId,
    pharmacyName: req.user!.org,
    distributorOrgId: 'org-distributor-1',
    distributorName: 'MedLink Distributors',
    manufacturerOrgId: batch.manufacturerOrgId,
    manufacturerName: batch.manufacturer,
    status: 'RETURN_REQUESTED',
    reason,
    quantities: {
      requested: qty,
      verified: 0,
      received: 0,
      disposed: 0,
      reconciled: 0,
    },
    expectedQty: qty,
    receivedQty: null,
    discrepancy: false,
    evidence: null,
    disposalCompleted: false,
    quantityReconciled: false,
    destructionVerified: false,
    closed: false,
    timeline: [],
    unitCodes: unitCodes || [],
    createdAt: now,
    updatedAt: now,
  };

  appendTimeline(store, record, 'RETURN_REQUESTED', req.user!, reason);
  store.returns.unshift(record);

  const batchIdx = store.batches.findIndex((b) => b.id === batch.id);
  store.batches[batchIdx] = applyPartialReturnToBatch(batch, qty);

  if (inv && inv.qty >= qty) {
    inv.qty -= qty;
    inv.updatedAt = now;
  }

  appendAudit(
    store,
    req.user!,
    'RETURN_CREATE',
    'Return',
    record.id,
    `Created ${returnCode} for ${qty} units of ${batch.batchNumber} (partial return tracked separately)`,
  );

  pushNotification(store, {
    role: 'Distributor',
    title: 'New return to verify',
    body: `${req.user!.org} submitted ${returnCode} (${qty} units ${batch.productName}).`,
    type: 'return',
    href: '/distributor/verify',
  });

  res.status(201).json({ return: enrichReturn(record, store) });
});

router.get('/settlements', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const settlements = store.settlements
    .filter((s) => s.pharmacyOrgId === req.user!.orgId)
    .map((s) => {
      const ret = store.returns.find((r) => r.id === s.returnId);
      return {
        ...s,
        returnStatus: ret?.status ?? null,
        returnClosed: ret?.closed ?? null,
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

/** Retail sale — reduce pharmacy shelf stock */
router.post('/sell', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { batchNumber, qty, note } = req.body as {
    batchNumber?: string;
    qty?: number;
    note?: string;
  };
  const bn = (batchNumber || '').trim();
  const n = Number(qty);
  if (!bn || !Number.isFinite(n) || n <= 0) {
    res.status(400).json({ error: 'batchNumber and qty (>0) are required' });
    return;
  }

  const batch = store.batches.find((b) => b.batchNumber === bn);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }

  try {
    deductInventoryQty(store, req.user!.orgId, bn, n);
    const now = new Date().toISOString();
    batch.updatedAt = now;
    batch.passport.push({
      id: nextId(store, 'pp'),
      at: now,
      status: 'SOLD_RETAIL',
      actor: req.user!.name,
      org: req.user!.org,
      note: note?.trim() || `Pharmacy sold ${n} units to customer`,
    });
    appendAudit(
      store,
      req.user!,
      'SELL_RETAIL',
      'Batch',
      batch.id,
      `Pharmacy sold ${n} of ${bn}`,
    );
    res.json({
      ok: true,
      soldQty: n,
      batchNumber: bn,
      inventory: store.inventory
        .filter((i) => i.orgId === req.user!.orgId)
        .map(applyExpiredNotForSale),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Sale failed' });
  }
});

export default router;
