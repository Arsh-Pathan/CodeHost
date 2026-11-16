import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import { z } from 'zod';
import { BuilderService } from '../services/builder.js';
import { RunnerService } from '../services/runner.js';

const router = Router();
router.use(requireAuth);

const FREE_DAILY_DEPLOY_LIMIT = 10;

async function acquireDeploySlot(projectId: string, tier: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const lockKey = `deploy-lock:${projectId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 600, 'NX').catch(() => 'OK');
  if (acquired !== 'OK') {
    return {
      ok: false,
      status: 409,
      error: 'A deployment is already in progress for this project. Please wait for it to finish.',
    };
  }

  if (tier === 'free') {
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `deploy-daily:${projectId}:${today}`;
    const count = await redis.incr(dailyKey).catch(() => 1);
    if (count === 1) {
      await redis.expire(dailyKey, 86400).catch(() => {});
    }
    if (count > FREE_DAILY_DEPLOY_LIMIT) {
      await redis.del(lockKey).catch(() => {});
      return {
        ok: false,
        status: 429,
        error: `Free tier allows up to ${FREE_DAILY_DEPLOY_LIMIT} deployments per day. Upgrade to Basic (50 cr/mo) for unlimited deployments.`,
      };
    }
  }

  return { ok: true };
}

async function releaseDeployLock(projectId: string): Promise<void> {
  await redis.del(`deploy-lock:${projectId}`).catch(() => {});
}

// Setup multer for zip uploads
const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + suffix + '.zip');
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  }
});

router.post('/:projectId', upload.single('code'), async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No zip file uploaded' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId }});
    if (!project || project.userId !== userId) {
      await fs.remove(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status === 'building') {
      await fs.remove(req.file.path).catch(() => {});
      return res.status(409).json({ error: 'A deployment is already in progress for this project.' });
    }

    const slot = await acquireDeploySlot(projectId, project.tier || 'free');
    if (!slot.ok) {
      await fs.remove(req.file.path).catch(() => {});
      return res.status(slot.status).json({ error: slot.error });
    }

    // 1. Create Deployment Record
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: 'queued'
      }
    });

    res.status(202).json({ 
      message: 'Deployment queued', 
      deploymentId: deployment.id 
    });

    // 2. Fire and forget the pipeline (Background Process)
    void (async () => {
      try {
        const imageName = await BuilderService.buildProject(
          deployment.id, 
          projectId, 
          req.file!.path
        );
        
        await RunnerService.startContainer(projectId, deployment.id, imageName);
      } catch (err) {
        logger.error(`Pipeline failed for ${deployment.id}`);
      } finally {
        await releaseDeployLock(projectId);
        // Cleanup uploaded zip
        await fs.remove(req.file!.path).catch(() => {});
      }
    })();

  } catch (error: any) {
    logger.error('Upload error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Deploy from GitHub repository
const githubDeploySchema = z.object({
  repoUrl: z.string().url().refine(
    (url) => /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(url),
    'Must be a valid GitHub repository URL'
  ),
  branch: z.string().min(1).max(100).default('main'),
  subdir: z.string().max(200).optional(),
});

router.post('/:projectId/github', async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user!.id;

    const { repoUrl, branch, subdir } = githubDeploySchema.parse(req.body);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status === 'building') {
      return res.status(409).json({ error: 'A deployment is already in progress for this project.' });
    }

    const slot = await acquireDeploySlot(projectId, project.tier || 'free');
    if (!slot.ok) {
      return res.status(slot.status).json({ error: slot.error });
    }

    // Save repo info on the project
    await prisma.project.update({
      where: { id: projectId },
      data: { repoUrl, repoBranch: branch, repoSubdir: subdir || null },
    });

    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: 'queued',
        source: 'github',
      },
    });

    res.status(202).json({
      message: 'GitHub deployment queued',
      deploymentId: deployment.id,
    });

    // Fire and forget pipeline
    void (async () => {
      try {
        const imageName = await BuilderService.buildProject(
          deployment.id,
          projectId,
          undefined,
          { repoUrl, branch, subdir: subdir || undefined }
        );
        await RunnerService.startContainer(projectId, deployment.id, imageName);
      } catch (err) {
        logger.error(`GitHub pipeline failed for ${deployment.id}`);
      } finally {
        await releaseDeployLock(projectId);
      }
    })();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('GitHub deploy error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get project deployments history
router.get('/:projectId', async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    
    const project = await prisma.project.findUnique({ where: { id: projectId }});
    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const deployments = await prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({ deployments });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
