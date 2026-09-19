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
    
    // Cryptographically verify the JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: string };
    
    if (!decoded || !decoded.id) {
       return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
