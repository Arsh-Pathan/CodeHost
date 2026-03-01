import { Router } from 'express';
import { prisma } from '@codehost/database';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import { z } from 'zod';

const router = Router();

// Apply auth middleware to all project routes
router.use(requireAuth);

const createProjectSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Name can only contain lowercase letters, numbers, and dashes'),
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name } = createProjectSchema.parse(req.body);
    const userId = req.user!.id;

    // Check free tier limit (1 project)
    const projectCount = await prisma.project.count({
      where: { userId }
    });

    if (projectCount >= 1) {
      return res.status(403).json({ error: 'Free tier limit reached (Max 1 project)' });
    }

    // Check if name is taken
    const existingProject = await prisma.project.findFirst({
      where: { name }
    });

    if (existingProject) {
      return res.status(400).json({ error: 'Project name already taken across the platform' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        userId,
        status: 'idle',
      }
    });

    logger.info(`Project created: ${project.id} by user ${userId}`);
    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error({ error }, 'Create project error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    logger.error({ error }, 'Get projects error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { email: true, username: true } } }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ project });
  } catch (error) {
    logger.error({ error }, 'Get project error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Stop container first
    try {
      const { RunnerService } = await import('../services/runner.js');
      await RunnerService.stopContainer(project.id);
    } catch (e) {
      logger.warn(`Failed to stop container for deleted project ${project.id}`);
    }

    await prisma.deployment.deleteMany({
      where: { projectId: project.id }
    });

    await prisma.project.delete({
      where: { id: project.id }
    });

    logger.info(`Project deleted: ${project.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Delete project error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/restart', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { deployments: { where: { status: 'success' }, orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const lastDeployment = project.deployments[0];
    if (!lastDeployment) {
      return res.status(400).json({ error: 'No successful deployment to restart' });
    }

    const { RunnerService } = await import('../services/runner.js');
    
    // We can use startContainer by pulling the image name from the last deployment
    // For now, let's assume the image name is standardized
    const imageName = `codehost-project-${project.id}:${lastDeployment.id}`;
    
    await RunnerService.startContainer(project.id, lastDeployment.id, imageName);
    
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'running' }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Restart project error');
    res.status(500).json({ error: 'Failed to restart project' });
  }
});

router.post('/:id/stop', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { RunnerService } = await import('../services/runner.js');
    await RunnerService.stopContainer(project.id);

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'stopped' }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Stop project error');
    res.status(500).json({ error: 'Failed to stop project' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { buildCommand, startCommand, dockerfileOverride, envVars } = req.body;

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        buildCommand: buildCommand ?? project.buildCommand,
        startCommand: startCommand ?? project.startCommand,
        dockerfileOverride: dockerfileOverride ?? project.dockerfileOverride,
        envVars: envVars ?? project.envVars,
      }
    });

    res.json({ project: updated });
  } catch (error) {
    logger.error({ error }, 'Update project error');
    res.status(500).json({ error: 'Failed to update project settings' });
  }
});

export default router;
