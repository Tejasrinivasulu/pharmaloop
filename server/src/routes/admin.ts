import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { toPublicUser } from '../auth.js';
import { requireAuth, requireRoles, type AuthedRequest } from '../middleware.js';
import { getStore } from '../store.js';
import { appendAudit, enrichReturn } from '../rules.js';
import { nextId, type Investigation, type Organization, type Role, type User } from '../types.js';

const ADMIN_CREATABLE_ROLES: Role[] = ['Distributor', 'Manufacturer', 'Admin'];

const router = Router();
router.use(requireAuth, requireRoles('Admin'));

router.get('/dashboard', async (_req: AuthedRequest, res) => {
  const store = await getStore();
  const openAlerts = store.alerts.filter((a) => a.status === 'OPEN');
  const openInvestigations = store.investigations.filter(
    (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS' || i.status === 'ESCALATED',
  );

  res.json({
    org: store.organizations.find((o) => o.type === 'Admin'),
    kpis: {
      organizations: store.organizations.length,
      activePharmacies: store.organizations.filter((o) => o.type === 'Pharmacy' && o.status === 'ACTIVE').length,
      totalReturns: store.returns.length,
      closedReturns: store.returns.filter((r) => r.closed).length,
      openDiscrepancies: store.returns.filter((r) => r.discrepancy && !r.closed).length,
      reEntryAlerts: store.alerts.filter((a) => a.type === 'POSSIBLE_RE_ENTRY' && a.status === 'OPEN').length,
      openInvestigations: openInvestigations.length,
      openAlerts: openAlerts.length,
      certificates: store.certificates.length,
      auditEvents: store.auditLog.length,
    },
    recentAlerts: store.alerts.slice(0, 6),
    recentInvestigations: store.investigations.slice(0, 5),
    recentAudit: store.auditLog.slice(0, 8),
    returnsByStatus: Object.fromEntries(
      [
        'RETURN_REQUESTED',
        'DISTRIBUTOR_VERIFIED',
        'MANUFACTURER_RECEIVED',
        'QUARANTINED',
        'DISPOSAL_REQUESTED',
        'DISPOSAL_COMPLETED',
        'EVIDENCE_SUBMITTED',
        'QUANTITY_RECONCILED',
        'DESTRUCTION_VERIFIED',
        'CLOSED',
      ].map((s) => [s, store.returns.filter((r) => r.status === s).length]),
    ),
  });
});

router.get('/organizations', async (_req, res) => {
  const store = await getStore();
  const organizations = store.organizations.map((o) => ({
    ...o,
    userCount: store.users.filter((u) => u.orgId === o.id).length,
    returnCount: store.returns.filter(
      (r) =>
        r.pharmacyOrgId === o.id ||
        r.distributorOrgId === o.id ||
        r.manufacturerOrgId === o.id,
    ).length,
    openAlerts: store.alerts.filter((a) => a.orgId === o.id && a.status === 'OPEN').length,
  }));
  res.json({ organizations });
});

router.get('/returns', async (_req, res) => {
  const store = await getStore();
  const returns = store.returns.map((r) => enrichReturn(r, store));
  res.json({ returns, count: returns.length });
});

router.get('/investigations', async (_req, res) => {
  const store = await getStore();
  const investigations = store.investigations.map((inv) => {
    const ret = inv.returnId ? store.returns.find((r) => r.id === inv.returnId) : undefined;
    return {
      ...inv,
      alert: store.alerts.find((a) => a.id === inv.alertId) || null,
      return: ret ? enrichReturn(ret, store) : null,
      batch: store.batches.find((b) => b.batchNumber === inv.batchNumber) || null,
    };
  });
  res.json({ investigations, count: investigations.length });
});

router.post('/investigations', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const {
    title,
    batchNumber,
    returnId,
    alertId,
    orgId,
    priority,
    findings,
  } = req.body as {
    title?: string;
    batchNumber?: string;
    returnId?: string;
    alertId?: string;
    orgId?: string;
    priority?: Investigation['priority'];
    findings?: string;
  };

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  if (returnId) {
    const exists = store.returns.some((r) => r.id === returnId);
    if (!exists) {
      res.status(400).json({ error: `Unknown returnId: ${returnId}` });
      return;
    }
  }
  const org = orgId ? store.organizations.find((o) => o.id === orgId) : undefined;
  const now = new Date().toISOString();
  const investigation: Investigation = {
    id: nextId(store, 'inv'),
    caseNo: `INV-2026-${String(store.seq).padStart(3, '0')}`,
    title,
    batchNumber,
    returnId,
    alertId,
    orgId,
    orgName: org?.name,
    status: 'OPEN',
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
    `Opened ${investigation.caseNo}: ${title}`,
  );

  res.status(201).json({ investigation });
});

router.get('/audit', async (_req, res) => {
  const store = await getStore();
  res.json({
    auditLog: store.auditLog,
    count: store.auditLog.length,
  });
});

router.get('/alerts', async (_req, res) => {
  const store = await getStore();
  const alerts = store.alerts.map((a) => ({
    ...a,
    relatedReturn: a.returnId
      ? store.returns.find((r) => r.id === a.returnId) || null
      : null,
    relatedBatch: a.batchNumber
      ? store.batches.find((b) => b.batchNumber === a.batchNumber) || null
      : null,
    investigation: store.investigations.find((i) => i.alertId === a.id) || null,
  }));
  res.json({ alerts, count: alerts.length });
});

router.get('/users', async (_req, res) => {
  const store = await getStore();
  const users = store.users.map((u) => {
    const org = store.organizations.find((o) => o.id === u.orgId);
    return {
      ...toPublicUser(u),
      orgName: org?.name || u.org,
      region: org?.region || '—',
      licenseNo: org?.licenseNo || '—',
      status: org?.status || 'ACTIVE',
    };
  });
  res.json({ users, count: users.length });
});

/** Admin creates Distributor / Manufacturer / Admin login accounts (not public signup). */
router.post('/users', async (req: AuthedRequest, res) => {
  const { name, email, password, role, orgId, orgName, licenseNo, region } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
    orgId?: string;
    orgName?: string;
    licenseNo?: string;
    region?: string;
  };

  if (!name?.trim() || !email?.trim() || !password || !role) {
    res.status(400).json({ error: 'name, email, password, and role are required' });
    return;
  }
  if (!ADMIN_CREATABLE_ROLES.includes(role)) {
    res.status(400).json({
      error: 'Only Distributor, Manufacturer, or Admin accounts can be created here. Pharmacies use public signup.',
    });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const store = await getStore();
  const normalized = email.trim().toLowerCase();
  if (store.users.some((u) => u.email.toLowerCase() === normalized)) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  let organization = orgId ? store.organizations.find((o) => o.id === orgId) : undefined;
  if (orgId && !organization) {
    res.status(400).json({ error: 'Unknown organization' });
    return;
  }
  if (organization && organization.type !== role) {
    res.status(400).json({ error: `Organization type must be ${role}` });
    return;
  }

  if (!organization) {
    if (!orgName?.trim()) {
      res.status(400).json({ error: 'Select an organization or provide a new organization name' });
      return;
    }
    const now = new Date().toISOString();
    organization = {
      id: nextId(store, 'org'),
      name: orgName.trim(),
      type: role,
      licenseNo: licenseNo?.trim() || `${role.slice(0, 3).toUpperCase()}-${store.seq}`,
      region: region?.trim() || 'Unassigned',
      address: 'Pending',
      contactEmail: normalized,
      status: 'ACTIVE',
      registeredAt: now,
    } satisfies Organization;
    store.organizations.push(organization);
  }

  const user: User = {
    id: nextId(store, 'user'),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 10),
    name: name.trim(),
    role,
    orgId: organization.id,
    org: organization.name,
  };
  store.users.push(user);

  appendAudit(
    store,
    req.user!,
    'USER_CREATE',
    'User',
    user.id,
    `Created ${role} account ${user.email} for ${organization.name}`,
  );

  res.status(201).json({
    user: {
      ...toPublicUser(user),
      orgName: organization.name,
      region: organization.region,
      licenseNo: organization.licenseNo,
      status: organization.status,
    },
  });
});

router.patch('/investigations/:id', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const inv = store.investigations.find((i) => i.id === req.params.id);
  if (!inv) {
    res.status(404).json({ error: 'Investigation not found' });
    return;
  }
  const { status, findings, priority, assignedTo } = req.body as {
    status?: Investigation['status'];
    findings?: string;
    priority?: Investigation['priority'];
    assignedTo?: string;
  };
  if (status) {
    if (!['OPEN', 'IN_PROGRESS', 'ESCALATED', 'CLOSED'].includes(status)) {
      res.status(400).json({ error: 'Invalid investigation status' });
      return;
    }
    inv.status = status;
  }
  if (findings != null) inv.findings = findings;
  if (priority) inv.priority = priority;
  if (assignedTo != null) inv.assignedTo = assignedTo;
  inv.updatedAt = new Date().toISOString();
  appendAudit(
    store,
    req.user!,
    'INVESTIGATION_UPDATE',
    'Investigation',
    inv.id,
    `Updated ${inv.caseNo}${status ? ` → ${status}` : ''}`,
  );
  res.json({ investigation: inv });
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
  res.json({
    alert: {
      ...alert,
      investigation: store.investigations.find((i) => i.alertId === alert.id) || null,
    },
  });
});

router.patch('/organizations/:id', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const org = store.organizations.find((o) => o.id === req.params.id);
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  const { status, region } = req.body as {
    status?: Organization['status'];
    region?: string;
  };
  if (status) {
    if (!['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW'].includes(status)) {
      res.status(400).json({ error: 'Invalid organization status' });
      return;
    }
    org.status = status;
  }
  if (region != null) org.region = region;
  appendAudit(
    store,
    req.user!,
    'ORG_UPDATE',
    'Organization',
    org.id,
    `Updated ${org.name}${status ? ` → ${status}` : ''}`,
  );
  res.json({
    organization: {
      ...org,
      userCount: store.users.filter((u) => u.orgId === org.id).length,
      returnCount: store.returns.filter(
        (r) =>
          r.pharmacyOrgId === org.id ||
          r.distributorOrgId === org.id ||
          r.manufacturerOrgId === org.id,
      ).length,
      openAlerts: store.alerts.filter((a) => a.orgId === org.id && a.status === 'OPEN').length,
    },
  });
});

router.post('/returns/:id/clear-discrepancy', async (req: AuthedRequest, res) => {
  const store = await getStore();
  const ret = store.returns.find((r) => r.id === req.params.id);
  if (!ret) {
    res.status(404).json({ error: 'Return not found' });
    return;
  }
  if (ret.closed) {
    res.status(409).json({ error: 'Cannot modify closed return' });
    return;
  }
  const { note } = req.body as { note?: string };
  ret.discrepancy = false;
  ret.discrepancyNote = note?.trim() || 'Discrepancy cleared by regulator review';
  ret.updatedAt = new Date().toISOString();
  appendAudit(store, req.user!, 'DISCREPANCY_CLEAR', 'Return', ret.id, ret.discrepancyNote);
  res.json({ return: enrichReturn(ret, store) });
});

export default router;
