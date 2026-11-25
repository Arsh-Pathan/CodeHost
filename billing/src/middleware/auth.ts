import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
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

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      scope?: string;
    };

    if (!decoded || !decoded.id || decoded.scope === 'mcp') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
