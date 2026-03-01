import { Router } from 'express';
import { prisma } from '@codehost/database';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import path from 'path';
import fs from 'fs-extra';
import { BuilderService } from '../services/builder.js';
import { RunnerService } from '../services/runner.js';

const router = Router();
router.use(requireAuth);

const getSourceDir = (projectId: string) => path.join(process.cwd(), 'storage', 'projects', projectId, 'source');

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
        } else {
          const stats = await fs.stat(absolutePath);
          return {
            name: item.name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            updatedAt: stats.mtime
          };
        }
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
    
    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    const fullPath = path.join(getSourceDir(projectId), filePath);
    
    // Security check: ensure path is within sourceDir
    if (!fullPath.startsWith(getSourceDir(projectId))) {
      return res.status(403).json({ error: 'Forbidden path' });
    }

    if (!await fs.pathExists(fullPath)) return res.status(404).json({ error: 'File not found' });
    if ((await fs.stat(fullPath)).isDirectory()) return res.status(400).json({ error: 'Is a directory' });

    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content });
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

    if (!filePath || content === undefined) return res.status(400).json({ error: 'filePath and content are required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    const fullPath = path.join(getSourceDir(projectId), filePath);
    if (!fullPath.startsWith(getSourceDir(projectId))) {
      return res.status(403).json({ error: 'Forbidden path' });
    }

    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);

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

    if (!filePath) return res.status(400).json({ error: 'filePath is required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });

    const fullPath = path.join(getSourceDir(projectId), filePath);
    if (!fullPath.startsWith(getSourceDir(projectId))) {
      return res.status(403).json({ error: 'Forbidden path' });
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

    // 2. Background Task
    void (async () => {
      try {
        const imageName = await BuilderService.buildProject(deployment.id, projectId);
        await RunnerService.startContainer(projectId, deployment.id, imageName);
      } catch (err) {
        logger.error(`Pipeline failed for ${deployment.id}`);
      }
    })();

  } catch (error) {
    logger.error({ error }, 'Deploy files error');
    res.status(500).json({ error: 'Failed to queue deployment' });
  }
});

export default router;
