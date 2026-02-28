import { Router } from 'express';
import { prisma } from '@codehost/database';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { logger } from '@codehost/logger';

const router = Router();

// Apply auth and admin middleware to all routes here
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard metrics for Admin
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [userCount, projectCount, deploymentCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.deployment.count()
    ]);

    const activeContainers = await prisma.project.count({
      where: { status: 'running' }
    });

    res.json({
      users: userCount,
      projects: projectCount,
      deployments: deploymentCount,
      activeContainers
    });
  } catch (error) {
    logger.error({ error }, 'Admin stats error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all projects across platform
router.get('/projects', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: { email: true }
        },
        _count: {
          select: { deployments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    logger.error({ error }, 'Admin projects error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { projects: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    logger.error({ error }, 'Admin users error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
