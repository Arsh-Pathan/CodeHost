import { Router } from 'express';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';
import { RESOURCE_TIERS } from '@codehost/config';
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
const MAX_WORKSPACE_FILES = 5000;
const SKIPPED_LIST_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.venv',
  'venv',
  '__pycache__',
  'target',
  'vendor',
  '.gradle',
  '.nuxt',
  '.output',
]);

async function getWorkspaceUsage(dirPath: string): Promise<{ files: number; bytes: number }> {
  if (!(await fs.pathExists(dirPath))) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        files++;
        const stat = await fs.lstat(full).catch(() => null);
        if (stat) bytes += stat.size;
      }
      if (files > MAX_WORKSPACE_FILES) return;
    }
  };
  await walk(dirPath);
  return { files, bytes };
}

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

    let totalEntries = 0;
    const MAX_LIST_ENTRIES = 2500;
    const getAllFiles = async (dirPath: string, relativeTo: string = '', depth = 0): Promise<any[]> => {
      if (depth > 12 || totalEntries >= MAX_LIST_ENTRIES) return [];
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const results: any[] = [];
      for (const item of items) {
        if (totalEntries >= MAX_LIST_ENTRIES) break;
        if (item.isSymbolicLink()) continue;
        const relativePath = path.join(relativeTo, item.name).replace(/\\/g, '/');
        const absolutePath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          if (SKIPPED_LIST_DIRS.has(item.name)) continue;
          totalEntries++;
          results.push({
            name: item.name,
            path: relativePath,
            type: 'directory',
            children: await getAllFiles(absolutePath, relativePath, depth + 1),
          });
        } else if (item.isFile()) {
          totalEntries++;
          const stats = await fs.lstat(absolutePath).catch(() => null);
          if (!stats) continue;
          results.push({
            name: item.name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            updatedAt: stats.mtime,
          });
        }
      }
      return results;
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
    const contentBytes = Buffer.byteLength(content, 'utf8');
    if (contentBytes > MAX_EDITABLE_FILE_BYTES) {
      return res.status(400).json({ error: 'File content exceeds 2MB editor limit' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    const locked = await redis.exists(`deploy-lock:${projectId}`).catch(() => 0);
    if (locked === 1) {
      return res.status(409).json({ error: 'Cannot edit files while a deployment is building.' });
    }

    const sourceDir = getSourceDir(projectId);
    let fullPath: string;
    try {
      fullPath = await resolveSafeProjectPath(sourceDir, filePath);
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden path' });
    }

    const existingStat = await fs.lstat(fullPath).catch(() => null);
    if (existingStat?.isDirectory()) {
      return res.status(400).json({ error: 'Cannot overwrite an existing directory with a file' });
    }

    const tierConfig = RESOURCE_TIERS[project.tier] || RESOURCE_TIERS.free;
    const maxWorkspaceBytes = Math.min(tierConfig.storage, 250 * 1024 * 1024);
    const usage = await getWorkspaceUsage(sourceDir);
    if (!existingStat && usage.files >= MAX_WORKSPACE_FILES) {
      return res.status(400).json({ error: `Workspace file limit (${MAX_WORKSPACE_FILES} files) reached` });
    }
    const projectedBytes = usage.bytes - (existingStat?.size || 0) + contentBytes;
    if (projectedBytes > maxWorkspaceBytes) {
      return res.status(400).json({ error: 'Workspace exceeds tier storage quota' });
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

    const locked = await redis.exists(`deploy-lock:${projectId}`).catch(() => 0);
    if (locked === 1) {
      return res.status(409).json({ error: 'Cannot delete files while a deployment is building.' });
    }

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

    const sourceDir = getSourceDir(projectId);
    const hasSource = (await fs.pathExists(sourceDir)) && (await fs.readdir(sourceDir)).length > 0;
    if (!hasSource) {
      return res.status(400).json({ error: 'Workspace contains no source files to deploy.' });
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
