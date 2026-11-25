import { Response, NextFunction } from 'express';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { AuthRequest } from './auth.js';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Re-check role live from DB so demoted or unverified accounts lose access immediately
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, emailVerified: true },
    });

    if (!user || user.role !== 'ADMIN' || !user.emailVerified) {
      return res.status(403).json({ error: 'Access denied: Requires verified Admin role' });
    }

    req.user.role = user.role;
    req.user.emailVerified = user.emailVerified;
    next();
  } catch (error) {
    logger.error({ error }, 'Admin role check error');
    return res.status(500).json({ error: 'Failed to verify admin permissions' });
  }
};
