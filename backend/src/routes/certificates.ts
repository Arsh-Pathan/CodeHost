import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '@codehost/database';
import { logger } from '@codehost/logger';
import { env } from '@codehost/config';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendCertificateAwardEmail } from '../lib/email.js';

const router = Router();

/**
 * GET /certificates/my-status
 * Check account certificate status & deployment eligibility
 */
router.get('/my-status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check if user already has an issued certificate
    const cert = await prisma.certificate.findUnique({
      where: { userId },
    });

    if (cert) {
      return res.json({
        claimed: true,
        eligible: true,
        certificate: {
          ...cert,
          certUrl: `${env.APP_URL}/certificate/${cert.id}`,
        },
      });
    }

    // Check if user has deployed at least 1 project on CodeHost
    const qualifyingProject = await prisma.project.findFirst({
      where: {
        userId,
        OR: [
          { status: 'running' },
          { deployments: { some: { status: 'running' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true },
    });

    res.json({
      claimed: false,
      eligible: Boolean(qualifyingProject),
      qualifyingProject: qualifyingProject?.name || null,
      certificate: null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to check certificate status');
    res.status(500).json({ error: 'Failed to check certificate status' });
  }
});

/**
 * POST /certificates/claim
 * Claim official Certified Cloud Deployer certificate for student account
 */
router.post('/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Return existing certificate if already claimed (one certificate per account)
    let cert = await prisma.certificate.findUnique({
      where: { userId },
    });

    if (cert) {
      return res.json({
        success: true,
        certificate: {
          ...cert,
          certUrl: `${env.APP_URL}/certificate/${cert.id}`,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has deployed at least 1 project on CodeHost
    const qualifyingProject = await prisma.project.findFirst({
      where: {
        userId,
        OR: [
          { status: 'running' },
          { deployments: { some: { status: 'running' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!qualifyingProject) {
      return res.status(400).json({
        error: 'You must successfully deploy at least one project on CodeHost to claim your certificate.',
      });
    }

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const certNumber = `CH-CERT-${randomSuffix}`;
    const recipientName = user.name || user.username;
    const liveUrl = `https://${qualifyingProject.name.toLowerCase()}.code-host.online`;

    cert = await prisma.certificate.create({
      data: {
        certNumber,
        userId,
        projectId: qualifyingProject.id,
        projectName: qualifyingProject.name,
        recipientName,
        title: 'Certified Cloud Deployer',
        description: 'Demonstrated practical competence in cloud deployment, container orchestration, and web service management on CodeHost cloud infrastructure.',
        framework: qualifyingProject.startCommand?.includes('python') || qualifyingProject.buildCommand?.includes('pip')
          ? 'Python Cloud Microservice'
          : 'Fullstack Web Application & Containers',
        liveUrl,
      },
    });

    // Send award email asynchronously
    const certUrl = `${env.APP_URL}/certificate/${cert.id}`;
    sendCertificateAwardEmail(user.email, {
      recipientName,
      projectName: qualifyingProject.name,
      liveUrl,
      certNumber,
      certUrl,
    }).catch((err) => logger.warn({ err }, 'Failed to send certificate award email'));

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
        projectName: cert.projectName || 'Production Cloud Services',
        title: cert.title,
        description: cert.description,
        framework: cert.framework,
        liveUrl: cert.liveUrl || 'https://code-host.online',
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
