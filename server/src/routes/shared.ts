import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware.js';
import { getStore } from '../store.js';
import {
  enrichBatch,
  handleClosedScan,
  appendAudit,
  applyExpiredNotForSale,
  pushNotification,
} from '../rules.js';
import { nextId } from '../types.js';

const router = Router();

router.get('/notifications', requireAuth, async (req: AuthedRequest, res) => {
  const store = await getStore();
  const items = store.notifications
    .filter((n) => n.userId === req.user!.id || n.role === req.user!.role)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({
    notifications: items,
    unreadCount: items.filter((n) => !n.read).length,
  });
});

router.post('/notifications/read-all', requireAuth, async (req: AuthedRequest, res) => {
  const store = await getStore();
  let count = 0;
  for (const n of store.notifications) {
    if ((n.userId === req.user!.id || n.role === req.user!.role) && !n.read) {
      n.read = true;
      count += 1;
    }
  }
  res.json({ marked: count });
});

router.post('/notifications/:id/read', requireAuth, async (req: AuthedRequest, res) => {
  const store = await getStore();
  const notif = store.notifications.find((n) => n.id === req.params.id);
  if (!notif) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  if (notif.userId !== req.user!.id && notif.role !== req.user!.role) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  notif.read = true;
  res.json({ notification: notif });
});

router.get('/search', requireAuth, async (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  const store = await getStore();

  const batches = store.batches
    .filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.strength.toLowerCase().includes(q),
    )
    .map((b) => ({
      type: 'batch' as const,
      id: b.id,
      batchNumber: b.batchNumber,
      productName: b.productName,
      strength: b.strength,
      status: b.status,
      expiryDate: b.expiryDate,
    }));

  const returns = store.returns
    .filter(
      (r) =>
        r.returnCode.toLowerCase().includes(q) ||
        r.batchNumber.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    )
    .map((r) => ({
      type: 'return' as const,
      id: r.id,
      returnCode: r.returnCode,
      batchNumber: r.batchNumber,
      productName: r.productName,
      status: r.status,
      pharmacyName: r.pharmacyName,
    }));

  const inventory = store.inventory
    .filter(
      (i) =>
        i.batchNumber.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        i.orgName.toLowerCase().includes(q),
    )
    .slice(0, 20)
    .map((i) => ({
      type: 'inventory' as const,
      id: i.id,
      batchNumber: i.batchNumber,
      productName: i.productName,
      status: i.status,
      qty: i.qty,
      orgName: i.orgName,
      notForSale: applyExpiredNotForSale(i).notForSale,
    }));

  const organizations = store.organizations
    .filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.licenseNo.toLowerCase().includes(q) ||
        o.region.toLowerCase().includes(q),
    )
    .map((o) => ({
      type: 'organization' as const,
      id: o.id,
      name: o.name,
      orgType: o.type,
      region: o.region,
      status: o.status,
    }));

  const alerts = store.alerts
    .filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        (a.batchNumber || '').toLowerCase().includes(q),
    )
    .map((a) => ({
      type: 'alert' as const,
      id: a.id,
      title: a.title,
      severity: a.severity,
      alertType: a.type,
      status: a.status,
    }));

  res.json({
    query: q,
    results: { batches, returns, inventory, organizations, alerts },
    total:
      batches.length +
      returns.length +
      inventory.length +
      organizations.length +
      alerts.length,
  });
});

router.get('/batches/:batchNumber', requireAuth, async (req: AuthedRequest, res) => {
  const store = await getStore();
  const batch = store.batches.find(
    (b) => b.batchNumber.toLowerCase() === String(req.params.batchNumber).toLowerCase(),
  );
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }

  // Optional scan simulation: ?scan=UNITCODE
  const scanUnit = typeof req.query.scan === 'string' ? req.query.scan : undefined;
  let reEntryAlert = null;
  if (scanUnit && (batch.closed || batch.status === 'VERIFIED_DISPOSAL' || batch.status === 'CLOSED')) {
    reEntryAlert = handleClosedScan(store, batch, scanUnit, req.user!.org, req.user!);
    appendAudit(
      store,
      req.user!,
      'SCAN_REENTRY',
      'Batch',
      batch.batchNumber,
      `Scan of closed/disposed unit ${scanUnit} → POSSIBLE_RE_ENTRY`,
    );
    store.notifications.unshift({
      id: nextId(store, 'notif'),
      userId: 'user-admin',
      role: 'Admin',
      title: `Re-entry alert — ${batch.batchNumber}`,
      body: reEntryAlert.message,
      type: 'alert',
      read: false,
      href: '/admin/ai-alerts',
      createdAt: new Date().toISOString(),
    });
    pushNotification(store, {
      role: 'Manufacturer',
      title: `Possible re-entry — ${batch.batchNumber}`,
      body: reEntryAlert.message,
      type: 'alert',
      href: '/manufacturer/alerts',
    });
  }

  res.json({
    passport: enrichBatch(batch, store),
    reEntryAlert,
  });
});

export default router;
