import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '@codehost/database';
import { env } from '@codehost/config';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import { sendVerificationEmail, sendWelcomeEmail } from '../lib/email.js';
import {
  completePendingReferral,
  generateUniqueReferralCode,
  isConfiguredAdminEmail,
  recordPendingReferral,
} from '../services/referral.js';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many requests, please try again later.' },
});

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many token requests, please try again later.' },
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Please wait before requesting another verification email.' },
});

export const generateTokens = (user: { id: string; email: string; role: string; emailVerified?: boolean }) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified ?? false,
      jti: crypto.randomUUID(),
    },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '60d' }
  );

  return { accessToken, refreshToken };
};

export const generateMcpToken = (user: { id: string; email: string; role: string; emailVerified?: boolean }) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified ?? false,
      scope: 'mcp',
      jti: crypto.randomUUID(),
    },
    env.JWT_SECRET,
    { expiresIn: '90d' }
  );
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password, username, name, phoneNumber, referralCode, acceptedTos, marketingEmails } = req.body;

    if (!rawEmail || !password || !username) {
      return res.status(400).json({ error: 'Email, password and username are required' });
    }

    if (typeof rawEmail !== 'string' || typeof password !== 'string' || typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid registration input types' });
    }

    if (acceptedTos === false || acceptedTos === 'false') {
      return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
    }

    const email = rawEmail.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length (6..128 avoids weak passwords and bcrypt 72-byte DoS)
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    // Sanitize username
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (sanitizedUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters (letters, numbers, underscore, hyphen)' });
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: sanitizedUsername } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const myReferralCode = await generateUniqueReferralCode(sanitizedUsername);

    // Never grant ADMIN role before email ownership is verified via verification link
    const user = await prisma.user.create({
      data: {
        email,
        username: sanitizedUsername,
        name: typeof name === 'string' ? name.trim().slice(0, 80) : undefined,
        phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim().slice(0, 30) : undefined,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        role: 'USER',
        serverLimit: 1,
        referralCode: myReferralCode,
        acceptedTos: acceptedTos !== false && acceptedTos !== 'false',
        marketingEmails: !(marketingEmails === false || marketingEmails === 'false'),
      },
    });

    // Record referral as pending until referee verifies their email
    if (typeof referralCode === 'string' && referralCode.trim()) {
      await recordPendingReferral(user.id, referralCode);
    }

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verificationToken).catch((err) => {
      logger.error({ err }, 'Failed to send verification email');
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      }
    });

    res.json({
      user: { id: user.id, email: user.email, username: user.username, emailVerified: false },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error({ error }, 'Registration error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const rawLoginId = identifier || email; // backward compat: accept either

    if (!rawLoginId || !password || typeof rawLoginId !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    if (password.length > 128) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const loginId = rawLoginId.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: loginId, mode: 'insensitive' } },
          { username: loginId },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account uses social login. Please sign in with Google or GitHub.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Lazily prune expired sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    }).catch(() => {});

    const { accessToken, refreshToken } = generateTokens(user);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      }
    });

    res.json({
      user: { id: user.id, email: user.email, username: user.username, emailVerified: user.emailVerified },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', tokenLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify token signature & structure
    jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

    const tokens = generateTokens(session.user);

    // Update session with freshly rotated refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      }
    });

    res.json(tokens);
  } catch (error) {
    logger.error({ error }, 'Refresh token error');
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Email verification - clicked from email link
router.get('/verify-email', tokenLimiter, async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    const shouldBeAdmin = isConfiguredAdminEmail(user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        ...(shouldBeAdmin ? { role: 'ADMIN', serverLimit: Math.max(user.serverLimit, 100) } : {}),
      },
    });

    // Release any pending referral rewards now that email ownership is verified
    await completePendingReferral(user.id).catch((err) => {
      logger.error({ err, userId: user.id }, 'Failed to complete pending referral');
    });

    // Send welcome email upon successful verification
    sendWelcomeEmail(user.email, user.name || user.username).catch((err) => {
      logger.error({ err }, 'Failed to send welcome email');
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error({ error }, 'Email verification error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email (authenticated)
router.post('/resend-verification', requireAuth, resendLimiter, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error({ error }, 'Resend verification error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { 
                id: true, 
                email: true, 
                username: true, 
                name: true, 
                avatarUrl: true,
                role: true, 
                tier: true,
                tierExpiresAt: true,
                serverLimit: true, 
                emailVerified: true, 
                provider: true, 
                createdAt: true 
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ user });
    } catch (error) {
        logger.error({ error }, 'Get me error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { name, avatarUrl } = req.body;
        const updateData: any = {};
        if (typeof name === 'string') updateData.name = name.trim().slice(0, 50);
        if (typeof avatarUrl === 'string') {
            const trimmedAvatar = avatarUrl.trim().slice(0, 500);
            if (trimmedAvatar === '') {
                updateData.avatarUrl = null;
            } else {
                const isRelativeSafe = trimmedAvatar.startsWith('/') && !trimmedAvatar.startsWith('//');
                let isValidHttpUrl = false;
                if (!isRelativeSafe) {
                    try {
                        const parsed = new URL(trimmedAvatar);
                        isValidHttpUrl = parsed.protocol === 'https:' || parsed.protocol === 'http:';
                    } catch {
                        isValidHttpUrl = false;
                    }
                }
                if (!isRelativeSafe && !isValidHttpUrl) {
                    return res.status(400).json({ error: 'Avatar URL must use http(s) or a site-relative path' });
                }
                updateData.avatarUrl = trimmedAvatar;
            }
        }

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatarUrl: true,
                role: true,
                tier: true,
                tierExpiresAt: true,
                serverLimit: true,
                emailVerified: true,
                provider: true,
                createdAt: true,
            }
        });

        res.json({ user });
    } catch (error) {
        logger.error({ error }, 'Update profile error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/mcp-token', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, username: true, role: true, emailVerified: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = generateMcpToken(user);
    const apiBase = (env.API_URL || 'https://api.code-host.online').replace(/\/$/, '');

    res.json({
      token,
      expiresInDays: 90,
      mcpEndpoint: `${apiBase}/mcp`,
    });
  } catch (error) {
    logger.error({ error }, 'Generate MCP token error');
    res.status(500).json({ error: 'Failed to generate MCP token' });
  }
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken && typeof refreshToken === 'string') {
            await prisma.session.deleteMany({
                where: { token: refreshToken, userId: req.user!.id }
            });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        logger.error({ error }, 'Logout error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
