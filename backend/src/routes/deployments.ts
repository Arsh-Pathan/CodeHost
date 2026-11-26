import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs-extra';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import { z } from 'zod';
import { BuilderService } from '../services/builder.js';
import { RunnerService } from '../services/runner.js';
import { acquireDeploySlot, releaseDeployLock } from '../services/deploy-lock.js';
import { ensureProjectBillingCurrent } from '../services/billing-guard.js';
import { validateGithubRepoInput } from '../lib/validation.js';

export { acquireDeploySlot, releaseDeployLock };

const router = Router();
router.use(requireAuth);

const deployLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: 'Too many deployment requests. Please wait a few minutes before retrying.' },
});

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
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  }
});

// Pre-upload check prevents accepting 50MB uploads for unauthorized, locked, or unpaid projects
const preUploadDeployGuard = async (req: AuthRequest, res: any, next: any) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user!.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const locked = await redis.exists(`deploy-lock:${projectId}`).catch(() => 0);
    if (locked === 1) {
      return res.status(409).json({ error: 'A deployment is already in progress for this project.' });
    }
    const billingCheck = await ensureProjectBillingCurrent(projectId, userId);
    if (!billingCheck.ok) {
      return res.status(billingCheck.status).json({ error: billingCheck.error });
    }
    (req as any)._guardedProject = project;
    next();
  } catch (error) {
    logger.error({ error }, 'Pre-upload deploy check error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/:projectId', deployLimiter, preUploadDeployGuard, upload.single('code'), async (req: AuthRequest, res) => {
  let lockToken: string | undefined;
  const projectId = req.params.projectId;
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No zip file uploaded' });
    }

    const project = (req as any)._guardedProject || await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      await fs.remove(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Project not found' });
    }

    const slot = await acquireDeploySlot(projectId, project.tier || 'free', userId);
    if (!slot.ok) {
      await fs.remove(req.file.path).catch(() => {});
      return res.status(slot.status).json({ error: slot.error });
    }
    lockToken = (slot as any).lockToken;

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
        logger.error({ err }, `Pipeline failed for ${deployment.id}`);
        await prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'failed' } }).catch(() => {});
        await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } }).catch(() => {});
      } finally {
        await releaseDeployLock(projectId, lockToken);
        await fs.remove(req.file!.path).catch(() => {});
      }
    })();

  } catch (error: any) {
    if (lockToken) {
      await releaseDeployLock(projectId, lockToken).catch(() => {});
    }
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }
    logger.error('Upload error', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Deploy from GitHub repository
const githubDeploySchema = z.object({
  repoUrl: z.string().min(1),
  branch: z.string().min(1).max(100).default('main'),
  subdir: z.string().max(200).optional(),
});

router.post('/:projectId/github', deployLimiter, async (req: AuthRequest, res) => {
  let lockToken: string | undefined;
  const projectId = req.params.projectId;
  try {
    const userId = req.user!.id;

    const rawParsed = githubDeploySchema.parse(req.body);
    const repoValidation = validateGithubRepoInput(rawParsed);
    if (!repoValidation.valid) {
      return res.status(400).json({ error: repoValidation.error || 'Invalid GitHub repository settings' });
    }
    const { repoUrl, branch, subdir } = repoValidation;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const billingCheck = await ensureProjectBillingCurrent(projectId, userId);
    if (!billingCheck.ok) {
      return res.status(billingCheck.status).json({ error: billingCheck.error });
    }

    const slot = await acquireDeploySlot(projectId, project.tier || 'free', userId);
    if (!slot.ok) {
      return res.status(slot.status).json({ error: slot.error });
    }
    lockToken = (slot as any).lockToken;

    // Save validated repo info on the project
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
        logger.error({ err }, `GitHub pipeline failed for ${deployment.id}`);
        await prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'failed' } }).catch(() => {});
        await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } }).catch(() => {});
      } finally {
        await releaseDeployLock(projectId, lockToken);
      }
    })();
  } catch (error: any) {
    if (lockToken) {
      await releaseDeployLock(projectId, lockToken).catch(() => {});
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('GitHub deploy error', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get single deployment details
router.get('/:projectId/:deploymentId', async (req: AuthRequest, res) => {
  try {
    const { projectId, deploymentId } = req.params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, projectId },
    });
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    res.json({ deployment });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
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
