import type { NextFunction, Request, Response } from 'express';
import { findUserById, verifyToken } from './auth.js';
import type { PublicUser, Role } from './types.js';
import { toPublicUser } from './auth.js';

export interface AuthedRequest extends Request {
  user?: PublicUser;
  tokenPayload?: { sub: string; email: string; role: Role; orgId: string };
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = await findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.tokenPayload = payload;
    req.user = toPublicUser(user);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden — requires one of: ${roles.join(', ')}`,
      });
      return;
    }
    next();
  };
}
