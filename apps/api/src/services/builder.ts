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

  private static async detectAndGenerateDockerfile(sourceDir: string): Promise<string> {
    const files = await fs.readdir(sourceDir);
    let dockerfile = '';

    if (files.includes('package.json')) {
      logger.info('Detected Node.js project');
      dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
      `;
    } else if (files.includes('requirements.txt') || files.includes('main.py')) {
      logger.info('Detected Python project');
      dockerfile = `
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["python", "main.py"]
      `;
    } else {
      logger.info('Defaulting to Static HTML project');
      dockerfile = `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
      `;
    }

    await fs.writeFile(path.join(sourceDir, 'Dockerfile'), dockerfile.trim());
    return dockerfile;
  }

  public static async buildProject(deploymentId: string, projectId: string, zipPath: string) {
    const workDir = path.join(process.cwd(), 'tmp', 'builds', deploymentId);
    const sourceDir = path.join(workDir, 'source');

    const emitLog = (message: string) => {
      io.to(`project:${projectId}`).emit('log', {
        type: 'build',
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
    };

    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'building' },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'building' },
      });

      emitLog('> Reading your code...');
      await fs.ensureDir(sourceDir);
      this.extractZip(zipPath, sourceDir);

      emitLog('> Determining the best way to run your app...');
      await this.detectAndGenerateDockerfile(sourceDir);

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
      await fs.remove(workDir).catch((e) => logger.warn(`Failed to cleanup workdir ${workDir}`, e));
    }
  }
}
