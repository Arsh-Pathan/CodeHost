import { docker } from '@codehost/docker';
import { logger } from '@codehost/logger';
import { prisma } from '@codehost/database';
import { env } from '@codehost/config';
import { io } from '../index.js';

export class RunnerService {
  public static async startContainer(projectId: string, deploymentId: string, imageName: string) {
    const emitLog = (message: string) => {
      io.to(`project:${projectId}`).emit('log', {
        type: 'run',
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
    };

    try {
      const containerName = `codehost-run-${projectId}`;

      try {
        const existing = docker.getContainer(containerName);
        await existing.stop();
        await existing.remove();
        logger.info(`Removed old container ${containerName}`);
      } catch (e) {
      }

      emitLog('> Preparing your app...');

      // Retrieve the running project and user for the routing path
      const project = await prisma.project.findUnique({ 
        where: { id: projectId },
        include: { user: true }
      });
      
      const username = project?.user?.email?.split('@')[0] || 'user';
      const projectSlug = project?.name || projectId;
      const host = env.DOMAIN || 'host.arsh-io.website';

      const container = await docker.createContainer({
        Image: imageName,
        name: containerName,
        HostConfig: {
          PublishAllPorts: true,
          Memory: env.MEMORY_LIMIT || 128 * 1024 * 1024,
          MemorySwap: env.MEMORY_LIMIT || 128 * 1024 * 1024, 
        },
        Labels: {
          'codehost.project': projectId,
          'codehost.deployment': deploymentId,
          // Traefik Dynamic Configuration (Path-Based)
          'traefik.enable': 'true',
          [`traefik.http.routers.${containerName}.rule`]: `Host(\`${host}\`) && PathPrefix(\`/${username}/${projectSlug}\`)`,
          [`traefik.http.routers.${containerName}.entrypoints`]: 'web',
          [`traefik.http.middlewares.${containerName}-strip.stripprefix.prefixes`]: `/${username}/${projectSlug}`,
          [`traefik.http.routers.${containerName}.middlewares`]: `${containerName}-strip`,
        }
      });

      await container.start();
      const containerInfo = await container.inspect();
      
      let mappedPort = null;
      if (containerInfo.NetworkSettings.Ports) {
        const keys = Object.keys(containerInfo.NetworkSettings.Ports);
        if (keys.length > 0 && containerInfo.NetworkSettings.Ports[keys[0]]) {
           mappedPort = parseInt(containerInfo.NetworkSettings.Ports[keys[0]][0].HostPort, 10);
        }
      }

      emitLog('> Your app is now live!');
      logger.info(`Started container ${containerName} on port ${mappedPort}`);

      // Attach container logs stream to websocket
      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        tail: 50,
      });

      docker.modem.demuxStream(logStream,
        { write: (chunk: any) => { emitLog(chunk.toString()); return true; } } as any,
        { write: (chunk: any) => { emitLog(`[ERROR] ${chunk.toString()}`); return true; } } as any
      );

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'success' }
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { 
          status: 'running',
          containerId: container.id,
          port: mappedPort
        }
      });

      return { containerId: container.id, port: mappedPort };
    } catch (error: any) {
      emitLog(`> Failed to launch app: ${error.message || 'Unknown error'}`);
      logger.error(`Runner failed for project ${projectId}`, error);
      await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'failed' } });
      throw error;
    }
  }
}
