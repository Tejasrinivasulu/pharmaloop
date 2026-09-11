import { Router } from 'express';
import { requireAuth, requireRoles, type AuthedRequest } from '../middleware.js';
import { getStore } from '../store.js';
import {
  appendAudit,
  appendTimeline,
  applyExpiredNotForSale,
  canCloseReturn,
  canVerifyDisposal,
  detectDiscrepancy,
  enrichReturn,
  inventoryStatusFromExpiry,
  pushNotification,
  transferStock,
} from '../rules.js';
import { nextId, type Batch, type Certificate, type DisposalEvidence } from '../types.js';

const router = Router();
router.use(requireAuth, requireRoles('Manufacturer'));

router.get('/dashboard', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const orgId = req.user!.orgId;
  const returns = store.returns.filter((r) => r.manufacturerOrgId === orgId);
  const alerts = store.alerts.filter(
    (a) => a.orgId === orgId || returns.some((r) => r.batchNumber === a.batchNumber),
  );
  const certificates = store.certificates.filter((c) =>
    returns.some((r) => r.id === c.returnId),
  );

  res.json({
    org: store.organizations.find((o) => o.id === orgId),
    kpis: {
      awaitingReceive: returns.filter((r) => r.status === 'DISTRIBUTOR_VERIFIED').length,
      inQuarantine: returns.filter((r) => r.status === 'QUARANTINED').length,
      disposalPending: returns.filter(
        (r) => r.status === 'DISPOSAL_REQUESTED' || r.status === 'DISPOSAL_COMPLETED',
      ).length,
      awaitingVerification: returns.filter((r) => r.status === 'QUANTITY_RECONCILED').length,
      closed: returns.filter((r) => r.closed).length,
      openDiscrepancies: returns.filter((r) => r.discrepancy && !r.closed).length,
      openAlerts: alerts.filter((a) => a.status === 'OPEN').length,
      certificatesIssued: certificates.length,
    },
    recentReturns: returns
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((r) => enrichReturn(r, store)),
    alerts: alerts.slice(0, 5),
    aiInsights: store.aiInsights.slice(0, 3),
  });
});

router.get('/returns', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const returns = store.returns
    .filter((r) => r.manufacturerOrgId === req.user!.orgId)
    .map((r) => enrichReturn(r, store));
  res.json({ returns, count: returns.length });
});

router.post('/receive', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, receivedQty, note } = req.body as {
    returnId?: string;
    receivedQty?: number;
    note?: string;
  };

  if (!returnId || receivedQty == null || receivedQty < 0) {
    res.status(400).json({ error: 'returnId and receivedQty are required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  if (ret.status !== 'DISTRIBUTOR_VERIFIED') {
    res.status(409).json({ error: `Expected DISTRIBUTOR_VERIFIED, got ${ret.status}` });
    return;
  }

  const expected = ret.expectedQty || ret.quantities.verified || ret.quantities.requested;
  const disc = detectDiscrepancy(expected, receivedQty);

  ret.receivedQty = receivedQty;
  ret.quantities.received = receivedQty;
  ret.discrepancy = disc.discrepancy;
  ret.discrepancyNote = disc.note;
  ret.status = 'MANUFACTURER_RECEIVED';

  const batch = store.batches.find((b) => b.batchNumber === ret.batchNumber);
  if (batch) {
    batch.quantities.received += receivedQty;
    if (disc.discrepancy) {
      batch.discrepancy = true;
      batch.status = 'DISCREPANCY';
    }
    batch.updatedAt = new Date().toISOString();
  }

  if (disc.discrepancy) {
    store.alerts.unshift({
      id: nextId(store, 'alert'),
      type: 'DISCREPANCY',
      severity: 'warning',
      title: `Quantity discrepancy — ${ret.batchNumber}`,
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
    'MANUFACTURER_RECEIVED',
    req.user!,
    note || disc.note || `Received ${receivedQty} units`,
  );
  appendAudit(store, req.user!, 'RETURN_RECEIVE', 'Return', ret.id, disc.note || `Received ${receivedQty}`);

  pushNotification(store, {
    role: 'Distributor',
    title: `Manufacturer received — ${ret.returnCode}`,
    body: disc.discrepancy
      ? `${req.user!.org} received ${receivedQty} with discrepancy: ${disc.note}`
      : `${req.user!.org} received ${receivedQty} units of ${ret.productName}.`,
    type: 'return',
    href: '/distributor/returns',
  });
  pushNotification(store, {
    role: 'Pharmacy',
    title: `At manufacturer — ${ret.returnCode}`,
    body: `${req.user!.org} received your return (${receivedQty} units).`,
    type: 'return',
    href: '/pharmacy/returns',
  });
  if (disc.discrepancy) {
    pushNotification(store, {
      role: 'Admin',
      title: `Receive discrepancy — ${ret.returnCode}`,
      body: disc.note || 'Expected ≠ received at manufacturer',
      type: 'alert',
      href: '/admin/discrepancies',
    });
  }

  // Mark matching manifest delivered if all returns received
  for (const man of store.manifests) {
    if (man.returnIds.includes(ret.id) && man.status === 'IN_TRANSIT') {
      const allReceived = man.returnIds.every((id) => {
        const r = store.returns.find((x) => x.id === id);
        return r && ['MANUFACTURER_RECEIVED', 'QUARANTINED', 'DISPOSAL_REQUESTED', 'DISPOSAL_COMPLETED', 'EVIDENCE_SUBMITTED', 'QUANTITY_RECONCILED', 'DESTRUCTION_VERIFIED', 'CLOSED'].includes(r.status);
      });
      if (allReceived) {
        man.status = 'DELIVERED';
        man.deliveredAt = new Date().toISOString();
      }
    }
  }

  res.json({ return: enrichReturn(ret, store), discrepancy: disc });
});

router.post('/quarantine', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, bay, note } = req.body as {
    returnId?: string;
    bay?: string;
    note?: string;
  };

  if (!returnId) {
    res.status(400).json({ error: 'returnId is required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  if (ret.status !== 'MANUFACTURER_RECEIVED') {
    res.status(409).json({ error: `Expected MANUFACTURER_RECEIVED, got ${ret.status}` });
    return;
  }

  ret.status = 'QUARANTINED';
  appendTimeline(
    store,
    ret,
    'QUARANTINED',
    req.user!,
    note || `Held in quarantine${bay ? ` bay ${bay}` : ''}`,
  );
  appendAudit(store, req.user!, 'QUARANTINE', 'Return', ret.id, bay || 'quarantined');

  res.json({ return: enrichReturn(ret, store) });
});

/** Disposal sub-routes under /disposal/* */
router.post('/disposal/request', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, note } = req.body as { returnId?: string; note?: string };
  if (!returnId) {
    res.status(400).json({ error: 'returnId is required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  if (ret.status !== 'QUARANTINED') {
    res.status(409).json({ error: `Expected QUARANTINED, got ${ret.status}` });
    return;
  }

  ret.status = 'DISPOSAL_REQUESTED';
  const batch = store.batches.find((b) => b.batchNumber === ret.batchNumber);
  if (batch && !batch.closed) {
    batch.status = 'DISPOSAL_PENDING';
    batch.updatedAt = new Date().toISOString();
  }

  appendTimeline(store, ret, 'DISPOSAL_REQUESTED', req.user!, note || 'Disposal order raised');
  appendAudit(store, req.user!, 'DISPOSAL_REQUEST', 'Return', ret.id, 'Disposal requested');

  res.json({ return: enrichReturn(ret, store) });
});

router.post('/disposal/complete', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, disposedQty, method, facility, note } = req.body as {
    returnId?: string;
    disposedQty?: number;
    method?: string;
    facility?: string;
    note?: string;
  };

  if (!returnId || disposedQty == null) {
    res.status(400).json({ error: 'returnId and disposedQty are required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  if (ret.status !== 'DISPOSAL_REQUESTED') {
    res.status(409).json({ error: `Expected DISPOSAL_REQUESTED, got ${ret.status}` });
    return;
  }

  ret.quantities.disposed = disposedQty;
  ret.disposalCompleted = true;
  ret.status = 'DISPOSAL_COMPLETED';

  const batch = store.batches.find((b) => b.batchNumber === ret.batchNumber);
  if (batch) {
    batch.quantities.disposed += disposedQty;
    batch.updatedAt = new Date().toISOString();
  }

  appendTimeline(
    store,
    ret,
    'DISPOSAL_COMPLETED',
    req.user!,
    note ||
      `Disposal completed${method ? ` via ${method}` : ''}${facility ? ` at ${facility}` : ''} — evidence still required before close`,
  );
  appendAudit(store, req.user!, 'DISPOSAL_COMPLETE', 'Return', ret.id, `Disposed ${disposedQty}`);

  res.json({
    return: enrichReturn(ret, store),
    notice:
      'Disposal completed does NOT allow close. Submit evidence, reconcile quantity, then verify destruction.',
  });
});

router.post('/disposal/evidence', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const {
    returnId,
    method,
    facility,
    documents,
    photoUrls,
    notes,
  } = req.body as {
    returnId?: string;
    method?: string;
    facility?: string;
    documents?: string[];
    photoUrls?: string[];
    notes?: string;
  };

  if (!returnId || !method || !facility) {
    res.status(400).json({ error: 'returnId, method, and facility are required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  if (ret.status !== 'DISPOSAL_COMPLETED') {
    res.status(409).json({ error: `Expected DISPOSAL_COMPLETED, got ${ret.status}` });
    return;
  }

  const evidence: DisposalEvidence = {
    certificateId: nextId(store, 'cert'),
    method,
    facility,
    submittedAt: new Date().toISOString(),
    submittedBy: req.user!.name,
    documents: documents || [],
    photoUrls: photoUrls || [],
    notes: notes || '',
  };

  ret.evidence = evidence;
  ret.status = 'EVIDENCE_SUBMITTED';

  const cert: Certificate = {
    id: evidence.certificateId,
    certificateNo: `CERT-DISP-2026-${String(store.seq).padStart(3, '0')}`,
    returnId: ret.id,
    batchNumber: ret.batchNumber,
    productName: `${ret.productName} ${ret.strength}`,
    qty: ret.quantities.disposed,
    method,
    facility,
    verifiedBy: 'Pending',
    issuedAt: evidence.submittedAt,
    status: 'ISSUED',
  };
  store.certificates.unshift(cert);

  appendTimeline(store, ret, 'EVIDENCE_SUBMITTED', req.user!, 'Disposal evidence pack submitted');
  appendAudit(store, req.user!, 'EVIDENCE_SUBMIT', 'Return', ret.id, cert.certificateNo);

  res.json({ return: enrichReturn(ret, store), certificate: cert });
});

router.post('/disposal/reconcile', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, reconciledQty, note } = req.body as {
    returnId?: string;
    reconciledQty?: number;
    note?: string;
  };

  if (!returnId || reconciledQty == null) {
    res.status(400).json({ error: 'returnId and reconciledQty are required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  if (ret.status !== 'EVIDENCE_SUBMITTED') {
    res.status(409).json({ error: `Expected EVIDENCE_SUBMITTED, got ${ret.status}` });
    return;
  }

  ret.quantities.reconciled = reconciledQty;
  ret.quantityReconciled = true;
  ret.status = 'QUANTITY_RECONCILED';

  appendTimeline(
    store,
    ret,
    'QUANTITY_RECONCILED',
    req.user!,
    note ||
      `Reconciled disposed=${ret.quantities.disposed}, received=${ret.quantities.received}, reconciled=${reconciledQty}`,
  );
  appendAudit(store, req.user!, 'QTY_RECONCILE', 'Return', ret.id, `Reconciled ${reconciledQty}`);

  res.json({ return: enrichReturn(ret, store) });
});

router.post('/disposal/close', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId } = req.body as { returnId?: string };
  if (!returnId) {
    res.status(400).json({ error: 'returnId is required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }

  const check = canCloseReturn(ret);
  if (!check.ok) {
    res.status(422).json({
      error: 'Cannot close return — compliance chain incomplete',
      blockers: check.errors,
      compliance: {
        disposalCompleted: ret.disposalCompleted,
        evidenceSubmitted: !!ret.evidence,
        quantityReconciled: ret.quantityReconciled,
        destructionVerified: ret.destructionVerified,
      },
      hint: 'Simple "destroyed" claims are rejected. Require evidence + qty reconcile + verification.',
    });
    return;
  }

  ret.status = 'CLOSED';
  ret.closed = true;
  ret.closedAt = new Date().toISOString();

  const batch = store.batches.find((b) => b.batchNumber === ret.batchNumber);
  if (batch) {
    batch.status = 'CLOSED';
    batch.closed = true;
    batch.notForSale = true;
    batch.passport.push({
      id: nextId(store, 'pp'),
      at: ret.closedAt,
      status: 'CLOSED',
      actor: req.user!.name,
      org: req.user!.org,
      note: `Return ${ret.returnCode} closed — VERIFIED_DISPOSAL`,
    });
    batch.updatedAt = ret.closedAt;
  }

  appendTimeline(store, ret, 'CLOSED', req.user!, 'Closed after full compliance chain');
  appendAudit(store, req.user!, 'RETURN_CLOSE', 'Return', ret.id, 'Closed');

  // Create pharmacy credit settlement if none exists for this return
  const existingSettlement = store.settlements.find((s) => s.returnId === ret.id);
  let settlement = existingSettlement;
  if (!settlement) {
    const qty = ret.quantities.reconciled || ret.quantities.disposed || ret.quantities.received || 0;
    const unitRate = 30;
    settlement = {
      id: nextId(store, 'set'),
      pharmacyOrgId: ret.pharmacyOrgId,
      pharmacyName: ret.pharmacyName,
      returnId: ret.id,
      returnCode: ret.returnCode,
      batchNumber: ret.batchNumber,
      productName: ret.productName,
      qty,
      amount: qty * unitRate,
      currency: 'INR',
      status: 'PENDING',
      creditNoteNo: `CN-2026-${String(store.seq).padStart(4, '0')}`,
      createdAt: ret.closedAt!,
    };
    store.settlements.unshift(settlement);
    appendAudit(
      store,
      req.user!,
      'SETTLEMENT_CREATE',
      'Settlement',
      settlement.id,
      `Pending credit ${settlement.creditNoteNo} for ${ret.returnCode}`,
    );
  }

  pushNotification(store, {
    role: 'Pharmacy',
    title: `Return closed — ${ret.returnCode}`,
    body: `Verified disposal complete. Credit ${settlement?.creditNoteNo || 'pending'} created.`,
    type: 'settlement',
    href: '/pharmacy/settlement',
  });
  pushNotification(store, {
    role: 'Admin',
    title: `Closed return — ${ret.returnCode}`,
    body: `${ret.batchNumber} closed after full compliance chain.`,
    type: 'compliance',
    href: '/admin/returns',
  });

  res.json({ return: enrichReturn(ret, store), settlement });
});

/** Enforce rules for verify-disposal */
router.post('/verify-disposal', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { returnId, note } = req.body as { returnId?: string; note?: string };

  if (!returnId) {
    res.status(400).json({ error: 'returnId is required' });
    return;
  }

  const ret = store.returns.find((r) => r.id === returnId);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }

  const check = canVerifyDisposal(ret);
  if (!check.ok) {
    res.status(422).json({
      error: 'Cannot verify disposal',
      blockers: check.errors,
      hint: 'Cannot close or verify with a simple "destroyed" claim — evidence + qty reconcile required.',
    });
    return;
  }

  if (ret.status !== 'QUANTITY_RECONCILED' && ret.status !== 'DESTRUCTION_VERIFIED') {
    res.status(409).json({ error: `Expected QUANTITY_RECONCILED, got ${ret.status}` });
    return;
  }

  ret.destructionVerified = true;
  ret.status = 'DESTRUCTION_VERIFIED';
  ret.quantities.verified = ret.quantities.reconciled;

  const batch = store.batches.find((b) => b.batchNumber === ret.batchNumber);
  if (batch) {
    batch.quantities.verified += ret.quantities.reconciled;
    batch.status = 'VERIFIED_DISPOSAL';
    batch.updatedAt = new Date().toISOString();
  }

  const cert = store.certificates.find((c) => c.returnId === ret.id);
  if (cert) cert.verifiedBy = req.user!.name;

  appendTimeline(
    store,
    ret,
    'DESTRUCTION_VERIFIED',
    req.user!,
    note || 'Destruction verified against evidence and reconciled quantities',
  );
  appendAudit(store, req.user!, 'DESTRUCTION_VERIFY', 'Return', ret.id, 'Verified disposal');

  res.json({
    return: enrichReturn(ret, store),
    nextStep: 'Call POST /api/manufacturer/disposal/close to formally close after verification',
  });
});

router.get('/ai', async (req: AuthedRequest, res) => {
  const store = await getStore();
  res.json({
    insights: store.aiInsights,
    generatedAt: new Date().toISOString(),
    model: 'PharmaLoop-Risk-v1',
  });
});

router.get('/alerts', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const orgId = req.user!.orgId;
  const returns = store.returns.filter((r) => r.manufacturerOrgId === orgId);
  const batchNos = new Set(returns.map((r) => r.batchNumber));
  const alerts = store.alerts.filter(
    (a) => a.orgId === orgId || (a.batchNumber && batchNos.has(a.batchNumber)),
  );
  res.json({ alerts, count: alerts.length });
});

router.patch('/alerts/:id', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const alert = store.alerts.find((a) => a.id === req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  const { status } = req.body as { status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' };
  if (!status || !['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
    res.status(400).json({ error: 'status must be OPEN, ACKNOWLEDGED, or RESOLVED' });
    return;
  }
  alert.status = status;
  if (status === 'RESOLVED') alert.resolvedAt = new Date().toISOString();
  appendAudit(store, req.user!, 'ALERT_UPDATE', 'Alert', alert.id, `Status → ${status}`);
  res.json({ alert });
});

router.get('/settlements', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const orgId = req.user!.orgId;
  const settlements = store.settlements
    .filter((s) => {
      const ret = store.returns.find((r) => r.id === s.returnId);
      return ret?.manufacturerOrgId === orgId;
    })
    .map((s) => {
      const ret = store.returns.find((r) => r.id === s.returnId);
      return {
        ...s,
        returnStatus: ret?.status ?? null,
        returnClosed: ret?.closed ?? null,
        distributorName: ret?.distributorName,
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

router.post('/settlements/:id/status', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const settlement = store.settlements.find((s) => s.id === req.params.id);
  if (!settlement) {
    res.status(404).json({ error: 'Settlement not found' });
    return;
  }
  const ret = store.returns.find((r) => r.id === settlement.returnId);
  if (!ret || ret.manufacturerOrgId !== req.user!.orgId) {
    res.status(403).json({ error: 'Not authorized for this settlement' });
    return;
  }
  const { status } = req.body as { status?: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' };
  if (!status || !['PENDING', 'APPROVED', 'PAID', 'REJECTED'].includes(status)) {
    res.status(400).json({ error: 'Invalid settlement status' });
    return;
  }
  settlement.status = status;
  if (status === 'PAID') settlement.paidAt = new Date().toISOString();
  if (!settlement.creditNoteNo && (status === 'APPROVED' || status === 'PAID')) {
    settlement.creditNoteNo = `CN-2026-${String(store.seq).padStart(4, '0')}`;
  }
  appendAudit(store, req.user!, 'SETTLEMENT_STATUS', 'Settlement', settlement.id, `Status → ${status}`);

  if (status === 'PAID' || status === 'APPROVED') {
    pushNotification(store, {
      role: 'Pharmacy',
      title: status === 'PAID' ? `Settlement paid — ${settlement.creditNoteNo}` : `Credit approved — ${settlement.creditNoteNo}`,
      body: `${settlement.productName}: ₹${settlement.amount} (${settlement.qty} units).`,
      type: 'settlement',
      href: '/pharmacy/settlement',
    });
  }

  res.json({ settlement });
});

router.post('/investigations', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { title, returnId, batchNumber, findings, priority } = req.body as {
    title?: string;
    returnId?: string;
    batchNumber?: string;
    findings?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const ret = returnId ? store.returns.find((r) => r.id === returnId) : undefined;
  if (returnId && !ret) {
    res.status(400).json({ error: 'Unknown returnId' });
    return;
  }
  if (ret && ret.manufacturerOrgId !== req.user!.orgId) {
    res.status(403).json({ error: 'Return is not assigned to your organization' });
    return;
  }
  const now = new Date().toISOString();
  const investigation = {
    id: nextId(store, 'inv'),
    caseNo: `INV-MFR-${String(store.seq).padStart(3, '0')}`,
    title: title.trim(),
    batchNumber: batchNumber || ret?.batchNumber,
    returnId: returnId || undefined,
    orgId: req.user!.orgId,
    orgName: req.user!.org,
    status: 'OPEN' as const,
    priority: priority || 'MEDIUM',
    findings: findings || '',
    assignedTo: req.user!.name,
    createdBy: req.user!.name,
    createdAt: now,
    updatedAt: now,
  };
  store.investigations.unshift(investigation);
  appendAudit(
    store,
    req.user!,
    'INVESTIGATION_OPEN',
    'Investigation',
    investigation.id,
    `Manufacturer opened ${investigation.caseNo}`,
  );
  res.status(201).json({ investigation });
});

router.get('/investigations', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const investigations = store.investigations.filter(
    (i) => i.orgId === req.user!.orgId || i.createdBy === req.user!.name,
  );
  res.json({ investigations, count: investigations.length });
});

/** Warehouse stock owned by this manufacturer */
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

router.get('/distributors', async (_req: AuthedRequest, res) => {
  const store = await getStore();
  const distributors = store.organizations.filter(
    (o) => o.type === 'Distributor' && o.status === 'ACTIVE',
  );
  res.json({ distributors });
});

/** Create medicine batch + put qty into manufacturer warehouse */
router.post('/batches', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const {
    batchNumber,
    productName,
    strength,
    form,
    manufacturingDate,
    expiryDate,
    qty,
    location,
  } = req.body as {
    batchNumber?: string;
    productName?: string;
    strength?: string;
    form?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    qty?: number;
    location?: string;
  };

  const bn = (batchNumber || '').trim().toUpperCase();
  const name = (productName || '').trim();
  const str = (strength || '').trim();
  const frm = (form || '').trim() || 'Tablet';
  const mfg = (manufacturingDate || '').trim();
  const exp = (expiryDate || '').trim();
  const n = Number(qty);

  if (!bn || !name || !str || !mfg || !exp || !Number.isFinite(n) || n <= 0) {
    res.status(400).json({
      error: 'batchNumber, productName, strength, manufacturingDate, expiryDate, and qty (>0) are required',
    });
    return;
  }
  if (store.batches.some((b) => b.batchNumber.toUpperCase() === bn)) {
    res.status(409).json({ error: `Batch ${bn} already exists` });
    return;
  }
  if (new Date(exp) <= new Date(mfg)) {
    res.status(400).json({ error: 'Expiry date must be after manufacturing date' });
    return;
  }

  const now = new Date().toISOString();
  const status = inventoryStatusFromExpiry(exp);
  const batchStatus =
    status === 'EXPIRED' ? 'EXPIRED' : status === 'EXPIRING' ? 'EXPIRING' : 'ACTIVE';

  const batch: Batch = {
    id: nextId(store, 'batch'),
    batchNumber: bn,
    productName: name,
    strength: str,
    form: frm,
    manufacturer: req.user!.org,
    manufacturerOrgId: req.user!.orgId,
    manufacturingDate: mfg,
    expiryDate: exp,
    quantities: {
      originalQty: n,
      distributed: 0,
      returned: 0,
      received: 0,
      disposed: 0,
      verified: 0,
    },
    status: batchStatus as Batch['status'],
    notForSale: status === 'EXPIRED',
    discrepancy: false,
    closed: false,
    passport: [
      {
        id: nextId(store, 'pp'),
        at: now,
        status: 'MANUFACTURED',
        actor: req.user!.name,
        org: req.user!.org,
        note: `Batch released — ${n} units in warehouse`,
      },
    ],
    units: [],
    createdAt: now,
    updatedAt: now,
  };
  store.batches.unshift(batch);
  store.inventory.unshift({
    id: nextId(store, 'inv'),
    orgId: req.user!.orgId,
    orgName: req.user!.org,
    batchNumber: bn,
    productName: name,
    strength: str,
    form: frm,
    manufacturer: req.user!.org,
    qty: n,
    expiryDate: exp,
    status,
    location: (location || '').trim() || 'Warehouse A',
    notForSale: status === 'EXPIRED',
    reason: status === 'EXPIRED' ? 'Expired — NOT FOR SALE' : undefined,
    updatedAt: now,
  });

  appendAudit(
    store,
    req.user!,
    'BATCH_CREATED',
    'Batch',
    batch.id,
    `Created ${bn} (${name}) qty ${n}`,
  );

  res.status(201).json({ batch, inventory: store.inventory.find((i) => i.orgId === req.user!.orgId && i.batchNumber === bn) });
});

/** Sell warehouse stock to a distributor */
router.post('/sell', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const { batchNumber, qty, distributorOrgId, note } = req.body as {
    batchNumber?: string;
    qty?: number;
    distributorOrgId?: string;
    note?: string;
  };
  const bn = (batchNumber || '').trim();
  const n = Number(qty);
  if (!bn || !distributorOrgId || !Number.isFinite(n) || n <= 0) {
    res.status(400).json({ error: 'batchNumber, distributorOrgId, and qty (>0) are required' });
    return;
  }

  const batch = store.batches.find((b) => b.batchNumber === bn);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }
  if (batch.manufacturerOrgId !== req.user!.orgId) {
    res.status(403).json({ error: 'You can only sell batches you manufacture' });
    return;
  }

  const buyer = store.organizations.find((o) => o.id === distributorOrgId);
  if (!buyer || buyer.type !== 'Distributor') {
    res.status(400).json({ error: 'Valid distributor organization required' });
    return;
  }

  try {
    const { buyerItem } = transferStock(store, {
      fromOrgId: req.user!.orgId,
      toOrg: buyer,
      batchNumber: bn,
      qty: n,
      actor: req.user!,
      passportStatus: 'SOLD_TO_DISTRIBUTOR',
      note: note?.trim() || `Sold ${n} units to ${buyer.name}`,
      buyerLocation: 'Distributor warehouse',
    });

    const distUser = store.users.find((u) => u.orgId === buyer.id);
    pushNotification(store, {
      role: 'Distributor',
      userId: distUser?.id,
      title: 'New stock received',
      body: `${n} units of ${batch.productName} (${bn}) from ${req.user!.org}`,
      type: 'stock',
      href: '/distributor/stock',
    });
    appendAudit(
      store,
      req.user!,
      'SELL_TO_DISTRIBUTOR',
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
