import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { PublicUser, Role, User } from './types.js';
import { getStore } from './store.js';

const JWT_SECRET = () => process.env.JWT_SECRET || 'pharmaloop-dev-secret-change-me';
const TOKEN_TTL = '12h';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  orgId: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    org: user.org,
  };
}

export function signToken(user: User): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
  };
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET()) as JwtPayload;
}

export async function authenticate(
  email: string,
  password: string,
  role?: Role,
): Promise<{ token: string; user: PublicUser } | { error: string; status: number }> {
  const store = await getStore();
  const normalized = email.trim().toLowerCase();
  const user = store.users.find((u) => u.email.toLowerCase() === normalized);

  if (!user) {
    return { error: 'Invalid email or password', status: 401 };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: 'Invalid email or password', status: 401 };
  }

  if (role && user.role !== role) {
    return {
      error: `Role mismatch: account is ${user.role}, requested ${role}`,
      status: 403,
    };
  }

  return { token: signToken(user), user: toPublicUser(user) };
}

export async function findUserById(id: string): Promise<User | undefined> {
  const store = await getStore();
  return store.users.find((u) => u.id === id);
}
