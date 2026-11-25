import { Router } from 'express';
import { prisma } from '@codehost/database';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import path from 'path';
import fs from 'fs-extra';
import { BuilderService } from '../services/builder.js';
import { RunnerService } from '../services/runner.js';
import { acquireDeploySlot, releaseDeployLock } from '../services/deploy-lock.js';
import { ensureProjectBillingCurrent } from '../services/billing-guard.js';
import { resolveSafeProjectPath } from '../lib/validation.js';

const router = Router();
router.use(requireAuth);

const getSourceDir = (projectId: string) => path.join(process.cwd(), 'storage', 'projects', projectId, 'source');
const MAX_EDITABLE_FILE_BYTES = 2 * 1024 * 1024;

// List files in a project
router.get('/:projectId', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    const sourceDir = getSourceDir(projectId);
    if (!await fs.pathExists(sourceDir)) {
      return res.json({ files: [] });
    }

    const getAllFiles = async (dirPath: string, relativeTo: string = ''): Promise<any[]> => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const files = await Promise.all(items.map(async (item) => {
        if (item.isSymbolicLink()) return null;
        const relativePath = path.join(relativeTo, item.name).replace(/\\/g, '/');
        const absolutePath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Ignore heavy or hidden folders
          if (item.name === 'node_modules' || item.name === '.git' || item.name === '.next') return null;
          return {
            name: item.name,
            path: relativePath,
            type: 'directory',
            children: await getAllFiles(absolutePath, relativePath)
          };
        } else if (item.isFile()) {
          const stats = await fs.lstat(absolutePath);
          return {
            name: item.name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            updatedAt: stats.mtime
          };
        }
        return null;
      }));
      return files.filter(Boolean);
    };

    const files = await getAllFiles(sourceDir);
    res.json({ files });
  } catch (error) {
    logger.error({ error }, 'List files error');
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Read file content
router.get('/:projectId/content', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { filePath } = req.query as { filePath: string };

    if (!filePath || typeof filePath !== 'string') return res.status(400).json({ error: 'filePath is required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    let fullPath: string;
    try {
      fullPath = await resolveSafeProjectPath(getSourceDir(projectId), filePath);
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden path' });
    }

    let stats;
    try {
      stats = await fs.lstat(fullPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    if (stats.isSymbolicLink()) return res.status(403).json({ error: 'Forbidden path: symbolic links are not allowed' });
    if (stats.isDirectory()) return res.status(400).json({ error: 'Is a directory' });
    if (stats.size > MAX_EDITABLE_FILE_BYTES) {
      return res.status(400).json({ error: 'File exceeds the 2MB in-browser editor limit' });
    }

    const buf = await fs.readFile(fullPath);
    if (buf.subarray(0, 8192).includes(0)) {
      return res.status(400).json({ error: 'Binary files cannot be opened in the text editor' });
    }

    res.json({ content: buf.toString('utf8') });
  } catch (error) {
    logger.error({ error }, 'Read file error');
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Save or Create file
router.post('/:projectId', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { filePath, content } = req.body;

    if (!filePath || typeof filePath !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ error: 'filePath and string content are required' });
    }
    if (Buffer.byteLength(content, 'utf8') > MAX_EDITABLE_FILE_BYTES) {
      return res.status(400).json({ error: 'File content exceeds 2MB editor limit' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    let fullPath: string;
    try {
      fullPath = await resolveSafeProjectPath(getSourceDir(projectId), filePath);
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden path' });
    }

    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Save file error');
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Delete file or directory
router.delete('/:projectId', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { filePath } = req.query as { filePath: string };

    if (!filePath || typeof filePath !== 'string') return res.status(400).json({ error: 'filePath is required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    let fullPath: string;
    try {
      fullPath = await resolveSafeProjectPath(getSourceDir(projectId), filePath);
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden path' });
    }

    await fs.remove(fullPath);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Delete file error');
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Deploy files
router.post('/:projectId/deploy', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) return res.status(404).json({ error: 'Project not found' });

    if (project.status === 'building') {
      return res.status(409).json({ error: 'A deployment is already in progress for this project.' });
    }

    const billingCheck = await ensureProjectBillingCurrent(projectId, userId);
    if (!billingCheck.ok) {
      return res.status(billingCheck.status).json({ error: billingCheck.error });
    }

    const slot = await acquireDeploySlot(projectId, project.tier || 'free', userId);
    if (!slot.ok) {
      return res.status(slot.status).json({ error: slot.error });
    }

    let deployment;
    try {
      // 1. Create Deployment Record
      deployment = await prisma.deployment.create({
        data: {
          projectId,
          status: 'queued',
          source: 'files',
        }
      });
    } catch (dbErr) {
      await releaseDeployLock(projectId, (slot as any).lockToken);
      throw dbErr;
    }

    res.status(202).json({
      message: 'Deployment queued',
      deploymentId: deployment.id
    });

    // 2. Background Task
    void (async () => {
      try {
        const imageName = await BuilderService.buildProject(deployment.id, projectId);
        await RunnerService.startContainer(projectId, deployment.id, imageName);
      } catch (err) {
        logger.error({ err }, `Pipeline failed for ${deployment.id}`);
        await prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'failed' } }).catch(() => {});
        await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } }).catch(() => {});
      } finally {
        await releaseDeployLock(projectId, (slot as any).lockToken);
      }
    })();

  } catch (error) {
    logger.error({ error }, 'Deploy files error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to queue deployment' });
    }
  }
});

export default router;
