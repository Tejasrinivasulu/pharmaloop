import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, findUserById, toPublicUser } from '../auth.js';
import { requireAuth, type AuthedRequest } from '../middleware.js';
import { getStore } from '../store.js';
import { nextId, type Organization, type Role, type User } from '../types.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body as {
    email?: string;
    password?: string;
    role?: Role;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const result = await authenticate(email, password, role);
  if ('error' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result);
});

/** Public signup — Pharmacy accounts only. Distributor/Manufacturer are created by Admin. */
router.post('/register', async (req, res) => {
  const { name, email, password, org } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    org?: string;
  };

  if (!name?.trim() || !email?.trim() || !password || !org?.trim()) {
    res.status(400).json({ error: 'name, email, password, and organization are required' });
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

  const orgName = org.trim();
  const now = new Date().toISOString();
  const organization: Organization = {
    id: nextId(store, 'org'),
    name: orgName,
    type: 'Pharmacy',
    licenseNo: `PH-PENDING-${store.seq}`,
    region: 'Pending verification',
    address: 'Pending',
    contactEmail: normalized,
    status: 'UNDER_REVIEW',
    registeredAt: now,
  };
  store.organizations.push(organization);

  const user: User = {
    id: nextId(store, 'user'),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 10),
    name: name.trim(),
    role: 'Pharmacy',
    orgId: organization.id,
    org: orgName,
  };
  store.users.push(user);

  res.status(201).json({
    user: toPublicUser(user),
    message: 'Pharmacy account created. Sign in with role Pharmacy.',
  });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

export default router;
