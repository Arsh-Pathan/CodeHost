import { Router } from 'express';
import { prisma } from '@codehost/database';
import { docker } from '@codehost/docker';
import { redis } from '@codehost/redis';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { logger } from '@codehost/logger';
import { RunnerService } from '../services/runner.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// Dashboard metrics
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

// System health check
router.get('/health', async (req: AuthRequest, res) => {
  try {
    const health: Record<string, { status: string; message: string }> = {};

    // Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database = { status: 'healthy', message: 'Connected' };
    } catch {
      health.database = { status: 'unhealthy', message: 'Connection failed' };
    }

    // Redis
    try {
      await redis.ping();
      health.redis = { status: 'healthy', message: 'Connected' };
    } catch {
      health.redis = { status: 'unhealthy', message: 'Connection failed' };
    }

    // Docker
    try {
      await docker.ping();
      health.docker = { status: 'healthy', message: 'Docker daemon running' };
    } catch {
      health.docker = { status: 'unhealthy', message: 'Docker not available' };
    }

    res.json({ health });
  } catch (error) {
    logger.error({ error }, 'Admin health error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all projects with user info
router.get('/projects', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: { email: true, username: true }
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

// Kill a project's container
router.post('/projects/:id/kill', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await RunnerService.stopContainer(project.id);
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'stopped' }
    });

    logger.info(`Admin ${req.user!.email} killed container for project ${project.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin kill container error');
    res.status(500).json({ error: 'Failed to kill container' });
  }
});

// Delete a project (admin override - any project)
router.delete('/projects/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    try {
      await RunnerService.stopContainer(project.id);
    } catch { /* ignore */ }

    await prisma.deployment.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });

    logger.info(`Admin ${req.user!.email} deleted project ${project.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin delete project error');
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// List all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        provider: true,
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

// Promote/Demote user role
router.put('/users/:id/role', async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER or ADMIN' });
    }

    // Prevent demoting yourself
    if (req.params.id === req.user!.id && role !== 'ADMIN') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, username: true, role: true }
    });

    logger.info(`Admin ${req.user!.email} changed role of ${updated.email} to ${role}`);
    res.json({ user: updated });
  } catch (error) {
    logger.error({ error }, 'Admin role update error');
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { projects: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Stop and clean up all user's containers/projects
    for (const project of user.projects) {
      try { await RunnerService.stopContainer(project.id); } catch { /* ignore */ }
      await prisma.deployment.deleteMany({ where: { projectId: project.id } });
    }
    await prisma.project.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    logger.info(`Admin ${req.user!.email} deleted user ${user.email}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Admin delete user error');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
