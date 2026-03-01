import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import tar from 'tar-fs';
import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';

import { io } from '../index.js';

export class BuilderService {
  private static extractZip(zipPath: string, extractPath: string) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
  }

  private static async detectAndGenerateDockerfile(sourceDir: string, project: any): Promise<string> {
    const files = await fs.readdir(sourceDir);
    let dockerfile = '';

    // 1. Check for Manual Dockerfile Override
    if (project.dockerfileOverride && project.dockerfileOverride.trim().length > 0) {
      logger.info('Using user-provided Dockerfile override');
      dockerfile = project.dockerfileOverride;
    } 
    // 2. Check for explicit Dockerfile in source (if not overridden by UI)
    else if (files.includes('Dockerfile')) {
      logger.info('Using Dockerfile found in source');
      dockerfile = await fs.readFile(path.join(sourceDir, 'Dockerfile'), 'utf8');
    }
    // 3. Fallback to Heuristics
    else if (files.includes('package.json')) {
      logger.info('Detected Node.js project');
      const buildCmd = project.buildCommand || 'npm install';
      const startCmd = project.startCommand || 'npm start';
      
      dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN ${buildCmd}
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ${startCmd.includes('[') ? startCmd : `["sh", "-c", "${startCmd}"]`}
      `;
    } else if (files.includes('requirements.txt') || files.includes('main.py')) {
      logger.info('Detected Python project');
      const buildCmd = project.buildCommand || (files.includes('requirements.txt') ? 'pip install --no-cache-dir -r requirements.txt' : 'echo "No requirements.txt"');
      const startCmd = project.startCommand || 'python main.py';

      dockerfile = `
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN ${buildCmd}
ENV PORT=8080
EXPOSE 8080
CMD ${startCmd.includes('[') ? startCmd : `["sh", "-c", "${startCmd}"]`}
      `;
    } else {
      logger.info('Defaulting to Static HTML project');
      dockerfile = `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
      `;
    }

    // Add Env Vars if present
    if (project.envVars && typeof project.envVars === 'object') {
      const envLines = Object.entries(project.envVars)
        .map(([key, value]) => `ENV ${key}="${value}"`)
        .join('\n');
      if (envLines) {
        // Insert after first line (FROM)
        const lines = dockerfile.trim().split('\n');
        lines.splice(1, 0, envLines);
        dockerfile = lines.join('\n');
      }
    }

    await fs.writeFile(path.join(sourceDir, 'Dockerfile'), dockerfile.trim());
    return dockerfile;
  }

  public static async buildProject(deploymentId: string, projectId: string, zipPath?: string) {
    const storageDir = path.join(process.cwd(), 'storage', 'projects', projectId);
    const sourceDir = path.join(storageDir, 'source');
    const buildTempDir = path.join(process.cwd(), 'tmp', 'builds', deploymentId);

    const emitLog = (message: string) => {
      io.to(`project:${projectId}`).emit('log', {
        type: 'build',
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
    };

    try {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error('Project not found');

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'building' },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'building' },
      });

      if (zipPath) {
        emitLog('> Reading your code...');
        await fs.ensureDir(sourceDir);
        await fs.emptyDir(sourceDir); // Clean existing source if uploading new zip
        this.extractZip(zipPath, sourceDir);
      }

      emitLog('> Determining the best way to run your app...');
      await this.detectAndGenerateDockerfile(sourceDir, project);

      // We need to pack the source for Docker build
      await fs.ensureDir(buildTempDir);
      const tarStream = tar.pack(sourceDir);
      const imageName = `codehost-project-${projectId.toLowerCase()}:${deploymentId}`;
      
      emitLog('> Building your app...');

      const stream = await docker.buildImage(tarStream, {
        t: imageName,
      });

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(
          stream,
          (err, res) => err ? reject(err) : resolve(res),
          (progress) => {
            if (progress.stream) {
              emitLog(progress.stream);
            }
          }
        );
      });

      emitLog('> Success! Preparing to launch...');
      logger.info(`Successfully built image ${imageName}`);
      return imageName;
    } catch (error: any) {
      emitLog(`> Something went wrong: ${error.message || 'Unknown error'}`);
      logger.error(`Build failed for deployment ${deploymentId}`, error);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'failed' },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'failed' },
      });
      throw error;
    } finally {
      await fs.remove(buildTempDir).catch((e) => logger.warn(`Failed to cleanup buildTempDir ${buildTempDir}`, e));
    }
  }
}
