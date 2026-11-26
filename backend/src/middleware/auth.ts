import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    emailVerified?: boolean;
    scope?: string;
    jti?: string;
    exp?: number;
  };
  file?: any;
}

interface CachedUserAuthState {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  tokenVersion: number;
  expiresAt: number;
}

const AUTH_STATE_CACHE_TTL_MS = 5_000;
const userAuthStateCache = new Map<string, CachedUserAuthState>();

export function invalidateUserAuthCache(userId: string) {
  if (userId) {
    userAuthStateCache.delete(userId);
  }
}

export async function revokeTokenJti(jti?: string, exp?: number): Promise<void> {
  if (!jti || typeof jti !== 'string') return;
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const remainingSec = typeof exp === 'number' && exp > nowSec ? Math.min(exp - nowSec, 90 * 86400) : 7200;
    if (remainingSec > 0) {
      await redis.set(`revoked:jti:${jti}`, '1', 'EX', remainingSec);
    }
  } catch {
    // Best-effort revocation if Redis is temporarily unreachable
  }
}

export async function isJtiRevoked(jti?: string): Promise<boolean> {
  if (!jti || typeof jti !== 'string' || process.env.NODE_ENV === 'test') return false;
  try {
    return (await redis.exists(`revoked:jti:${jti}`)) === 1;
  } catch {
    return false;
  }
}

export async function getLiveUserAuthState(userId: string): Promise<CachedUserAuthState | null> {
  const now = Date.now();
  const cached = userAuthStateCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true, tokenVersion: true },
  });

  if (!user) {
    userAuthStateCache.delete(userId);
    return null;
  }

  if (userAuthStateCache.size > 5000) {
    userAuthStateCache.clear();
  }
  const entry: CachedUserAuthState = {
    ...user,
    expiresAt: now + AUTH_STATE_CACHE_TTL_MS,
  };
  userAuthStateCache.set(userId, entry);
  return entry;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Cryptographically verify the JWT token with pinned HS256 algorithm
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as {
      id: string;
      email: string;
      role: string;
      emailVerified?: boolean;
      scope?: string;
      typ?: string;
      tv?: number;
      jti?: string;
      exp?: number;
    };

    if (!decoded || !decoded.id || decoded.typ === 'refresh') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Long-lived MCP integration tokens are strictly scoped to /mcp and must not authorize REST API routes
    if (decoded.scope === 'mcp' && req.baseUrl !== '/mcp') {
      return res.status(401).json({ error: 'MCP tokens are restricted to MCP endpoints' });
    }

    if (await isJtiRevoked(decoded.jti)) {
      return res.status(401).json({ error: 'Session revoked' });
    }

    let email = decoded.email;
    let role = decoded.role;
    let emailVerified = Boolean(decoded.emailVerified);

    if (process.env.NODE_ENV !== 'test') {
      const liveUser = await getLiveUserAuthState(decoded.id);
      if (!liveUser) {
        return res.status(401).json({ error: 'Account no longer exists' });
      }
      if (typeof decoded.tv === 'number' && decoded.tv !== liveUser.tokenVersion) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }
      email = liveUser.email;
      role = liveUser.role;
      emailVerified = liveUser.emailVerified;
    }

    req.user = {
      id: decoded.id,
      email,
      role,
      emailVerified,
      scope: decoded.scope,
      jti: decoded.jti,
      exp: decoded.exp,
    };
    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
