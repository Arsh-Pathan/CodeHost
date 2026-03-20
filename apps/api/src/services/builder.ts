import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
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

  private static cloneRepo(repoUrl: string, branch: string, targetDir: string, subdir?: string): string {
    // Sanitize inputs to prevent command injection
    const sanitizedUrl = repoUrl.replace(/[;&|`$()]/g, '');
    const sanitizedBranch = branch.replace(/[;&|`$()]/g, '');

    try {
      execSync(
        `git clone --depth 1 --branch "${sanitizedBranch}" "${sanitizedUrl}" "${targetDir}"`,
        { timeout: 120000, stdio: 'pipe' }
      );
    } catch (error: any) {
      if (error.message && (error.message.includes('not found') || error.message.includes('ENOENT'))) {
        throw new Error('Git is not installed in the deployment environment. Please contact support.');
      }
      throw new Error(`Failed to clone repository: ${error.stderr?.toString() || error.message}`);
    }

    // If a subdirectory is specified, return the path to it
    if (subdir) {
      const subdirPath = path.join(targetDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        throw new Error(`Subdirectory "${subdir}" not found in repository`);
      }
      return subdirPath;
    }
    return targetDir;
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
      let packageJson: any = {};
      try {
        packageJson = JSON.parse(await fs.readFile(path.join(sourceDir, 'package.json'), 'utf8'));
      } catch (e) {
        logger.warn('Failed to parse package.json, using defaults');
      }

      const buildCmd = project.buildCommand || 'npm install --legacy-peer-deps';
      const startCmd = project.startCommand || (packageJson.scripts?.start ? 'npm start' : null);
      
      // Heuristic: If it's Astro, Vite, or another known static generator without a start script
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const isStaticGenerator = dependencies['astro'] || dependencies['vite'] || dependencies['@sveltejs/kit'];

      if (isStaticGenerator && !startCmd) {
        logger.info('Static site generator detected, using multi-stage Nginx build');
        const buildScript = packageJson.scripts?.build ? 'npm run build' : 'echo "No build script"';
        const distDir = dependencies['astro'] ? 'dist' : (dependencies['vite'] ? 'dist' : 'public');

        dockerfile = `
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN ${buildCmd}
COPY . .
RUN ${buildScript}

# Serve Stage
FROM nginx:alpine
COPY --from=builder /app/${distDir} /usr/share/nginx/html
EXPOSE 80
        `;
      } else {
        dockerfile = `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN ${buildCmd}
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ${startCmd ? (startCmd.includes('[') ? startCmd : `["sh", "-c", "${startCmd}"]`) : '["node", "index.js"]'}
        `;
      }
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

  public static async buildProject(
    deploymentId: string,
    projectId: string,
    zipPath?: string,
    gitOptions?: { repoUrl: string; branch: string; subdir?: string }
  ) {
    const storageDir = path.join(process.cwd(), 'storage', 'projects', projectId);
    const sourceDir = path.join(storageDir, 'source');
    const buildTempDir = path.join(process.cwd(), 'tmp', 'builds', deploymentId);
    const cloneTempDir = path.join(process.cwd(), 'tmp', 'clones', deploymentId);

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
        await fs.emptyDir(sourceDir);
        this.extractZip(zipPath, sourceDir);
      } else if (gitOptions) {
        emitLog(`> Cloning repository from GitHub...`);
        emitLog(`> Branch: ${gitOptions.branch}${gitOptions.subdir ? `, Directory: ${gitOptions.subdir}` : ''}`);
        await fs.ensureDir(sourceDir);
        await fs.emptyDir(sourceDir);
        await fs.ensureDir(cloneTempDir);

        try {
          const clonedPath = this.cloneRepo(
            gitOptions.repoUrl,
            gitOptions.branch,
            cloneTempDir,
            gitOptions.subdir
          );
          // Copy cloned content to sourceDir
          await fs.copy(clonedPath, sourceDir, { overwrite: true });
          emitLog('> Repository cloned successfully!');
        } finally {
          await fs.remove(cloneTempDir).catch(() => {});
        }
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
          (err, res) => {
            if (err) return reject(err);
            // Check the last result in the stream for internal build errors
            const lastMessage = Array.isArray(res) ? res[res.length - 1] : res;
            if (lastMessage && lastMessage.error) {
              return reject(new Error(lastMessage.error));
            }
            resolve(res);
          },
          (progress) => {
            if (progress.stream) {
              emitLog(progress.stream);
            }
            if (progress.error) {
              emitLog(`> Error during build: ${progress.error}`);
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
      await fs.remove(cloneTempDir).catch(() => {});
    }
  }
}
