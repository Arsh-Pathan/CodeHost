import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { env } from '@codehost/config';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendCertificateAwardEmail } from '../lib/email.js';

const router = Router();

/**
 * POST /certificates/claim
 * Claim official Certified Cloud Deployer certificate for a live project
 */
router.post('/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const userId = req.user!.id;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { user: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Project must have been deployed or running
    const hasSuccessfulDeployment = await prisma.deployment.findFirst({
      where: { projectId, status: 'running' },
    });

    if (project.status !== 'running' && !hasSuccessfulDeployment) {
      return res.status(400).json({
        error: 'Project must be successfully deployed and running to claim a certificate',
      });
    }

    // Idempotency: return existing certificate if already claimed
    let cert = await prisma.certificate.findFirst({
      where: { projectId, userId },
    });

    if (!cert) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const certNumber = `CH-CERT-${randomSuffix}`;
      const recipientName = project.user.name || project.user.username;
      const liveUrl = `https://${project.name.toLowerCase()}.code-host.online`;

      cert = await prisma.certificate.create({
        data: {
          certNumber,
          userId,
          projectId,
          projectName: project.name,
          recipientName,
          title: 'Certified Cloud Deployer',
          description: 'Successfully deployed a production cloud application on CodeHost infrastructure with automated HTTPS and isolated container virtualization.',
          framework: project.startCommand?.includes('python') || project.buildCommand?.includes('pip') ? 'Python Cloud Microservice' : 'Next.js / Node.js Production App',
          liveUrl,
        },
      });

      // Send award email asynchronously
      const certUrl = `${env.APP_URL}/certificate/${cert.id}`;
      sendCertificateAwardEmail(project.user.email, {
        recipientName,
        projectName: project.name,
        liveUrl,
        certNumber,
        certUrl,
      }).catch((err) => logger.warn({ err }, 'Failed to send certificate award email'));
    }

    const certUrl = `${env.APP_URL}/certificate/${cert.id}`;
    res.json({
      success: true,
      certificate: {
        ...cert,
        certUrl,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to claim certificate');
    res.status(500).json({ error: 'Internal server error claiming certificate' });
  }
});

/**
 * GET /certificates/project/:projectId
 * Get certificate status for a project
 */
router.get('/project/:projectId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const cert = await prisma.certificate.findFirst({
      where: { projectId, userId },
    });

    if (!cert) {
      return res.json({ claimed: false });
    }

    res.json({
      claimed: true,
      certificate: {
        ...cert,
        certUrl: `${env.APP_URL}/certificate/${cert.id}`,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get project certificate');
    res.status(500).json({ error: 'Failed to retrieve certificate' });
  }
});

/**
 * GET /certificates/verify/:idOrCode
 * Public verification endpoint
 */
router.get('/verify/:idOrCode', async (req, res) => {
  try {
    const { idOrCode } = req.params;
    if (!idOrCode) {
      return res.status(400).json({ error: 'Certificate identifier required' });
    }

    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { certNumber: idOrCode.toUpperCase() },
        ],
      },
      include: {
        user: {
          select: {
            username: true,
            referralCode: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!cert) {
      return res.status(404).json({ valid: false, error: 'Certificate not found or invalid' });
    }

    res.json({
      valid: true,
      certificate: {
        id: cert.id,
        certNumber: cert.certNumber,
        recipientName: cert.recipientName,
        projectName: cert.projectName,
        title: cert.title,
        description: cert.description,
        framework: cert.framework,
        liveUrl: cert.liveUrl,
        issuedAt: cert.issuedAt,
        authorUsername: cert.user.username,
        authorAvatar: cert.user.avatarUrl,
        authorReferralCode: cert.user.referralCode,
        certUrl: `${env.APP_URL}/certificate/${cert.id}`,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to verify certificate');
    res.status(500).json({ valid: false, error: 'Verification error' });
  }
});

export default router;
