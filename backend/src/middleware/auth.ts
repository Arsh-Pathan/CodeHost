import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    emailVerified?: boolean;
    scope?: string;
  };
  file?: any;
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

    // Cryptographically verify the JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      emailVerified?: boolean;
      scope?: string;
    };

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Long-lived MCP integration tokens are strictly scoped to /mcp and must not authorize REST API routes
    if (decoded.scope === 'mcp' && req.baseUrl !== '/mcp') {
      return res.status(401).json({ error: 'MCP tokens are restricted to MCP endpoints' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      emailVerified: Boolean(decoded.emailVerified),
      scope: decoded.scope,
    };
    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
