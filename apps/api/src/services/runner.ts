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
      
      const username = project?.user?.username || project?.user?.email?.split('@')[0].toLowerCase() || 'user';
      const projectSlug = project?.name.toLowerCase() || projectId;
      const host = 'host.arsh-io.website';

      const container = await docker.createContainer({
        Image: imageName,
        name: containerName,
        HostConfig: {
          PublishAllPorts: true,
          Memory: env.MEMORY_LIMIT || 128 * 1024 * 1024,
          MemorySwap: env.MEMORY_LIMIT || 128 * 1024 * 1024,
          NetworkMode: 'docker_default', // Connect to the Brain's network
        },
        Labels: {
          'traefik.enable': 'true',
          // Rule: host.arsh-io.website/username/project
          [`traefik.http.routers.${containerName}.rule`]: `Host(\`${host}\`) && PathPrefix(\`/${username}/${projectSlug}\`)`,
          [`traefik.http.routers.${containerName}.entrypoints`]: 'web',
          
          // Port 80 is where our Nginx static server runs inside the user container
          [`traefik.http.services.${containerName}.loadbalancer.server.port`]: '80',
          
          // Strip the /username/project prefix before sending to the app
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
        { write: (chunk: any) => { 
          const msg = chunk.toString();
          // Many apps use stderr for notices. Only tag as ERROR if it contains error keywords
          const isError = /error|fatal|exception/i.test(msg);
          emitLog(isError ? `[ERROR] ${msg}` : msg); 
          return true; 
        } } as any
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

  public static async getStats(projectId: string) {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      
      const stats = await container.stats({ stream: false });
      
      // Calculate CPU percentage
      // Formula: (cpu_delta / system_delta) * number_of_cpus * 100.0
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      
      let cpuPercent = 0;
      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100.0;
      }

      // Memory usage
      const memUsage = stats.memory_stats.usage;
      const memLimit = stats.memory_stats.limit;
      const memPercent = (memUsage / memLimit) * 100.0;

      return {
        cpu: parseFloat(cpuPercent.toFixed(2)),
        memory: {
          usage: memUsage,
          limit: memLimit,
          percent: parseFloat(memPercent.toFixed(2))
        }
      };
    } catch (e) {
      return null;
    }
  }

  public static async stopContainer(projectId: string) {
    try {
      const containerName = `codehost-run-${projectId}`;
      const container = docker.getContainer(containerName);
      await container.stop();
      await container.remove();
      logger.info(`Stopped and removed container ${containerName}`);
    } catch (e: any) {
      logger.warn(`Could not stop container for ${projectId}: ${e.message}`);
    }
  }
}
