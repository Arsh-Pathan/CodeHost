import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '@codehost/database';
import { redis } from '@codehost/redis';
import { env } from '@codehost/config';
import {
  requireAuth,
  AuthRequest,
  invalidateUserAuthCache,
  revokeTokenJti,
} from '../middleware/auth.js';
import { logger } from '@codehost/logger';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../lib/email.js';
import { disconnectUserSockets } from '../lib/socket-registry.js';
import { RESERVED_PROJECT_NAMES } from '../lib/validation.js';
import {
  completePendingReferral,
  generateUniqueReferralCode,
  isConfiguredAdminEmail,
  recordPendingReferral,
  REFEREE_REWARD_CREDITS,
} from '../services/referral.js';

const router = Router();
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('codehost_timing_pad_secret_value', 10);

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
  message: { error: 'Please wait before requesting another security email.' },
});

export const generateTokens = (user: {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  tokenVersion?: number;
}) => {
  const tokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified ?? false,
      typ: 'access',
      tv: tokenVersion,
      jti: crypto.randomUUID(),
    },
    env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, typ: 'refresh', tv: tokenVersion, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '60d' }
  );

  return { accessToken, refreshToken };
};

export const generateMcpToken = (user: {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  tokenVersion?: number;
}) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified ?? false,
      scope: 'mcp',
      typ: 'mcp',
      tv: typeof user.tokenVersion === 'number' ? user.tokenVersion : 0,
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

    if (acceptedTos !== true && acceptedTos !== 'true') {
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
    if (sanitizedUsername.length < 2 || sanitizedUsername.length > 32) {
      return res.status(400).json({
        error: 'Username must be between 2 and 32 characters (letters, numbers, underscore, hyphen)',
      });
    }
    if (RESERVED_PROJECT_NAMES.has(sanitizedUsername)) {
      return res.status(400).json({ error: 'That username is reserved. Please choose another.' });
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
        acceptedTos: true,
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
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Email or username already registered' });
    }
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

    // Per-account Redis throttle to block distributed IP / proxy-bypass brute force
    try {
      const acctKey = `login-acct:${crypto.createHash('sha256').update(loginId).digest('hex').slice(0, 24)}`;
      const attempts = await redis.incr(acctKey);
      if (attempts === 1) await redis.expire(acctKey, 900);
      if (attempts > 20) {
        return res.status(429).json({ error: 'Too many login attempts for this account. Please try again later.' });
      }
    } catch {
      // Fallback safely if Redis is unavailable
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: loginId, mode: 'insensitive' } },
          { username: loginId },
        ],
      },
    });

    // Run constant-time bcrypt comparison even when user is missing or OAuth-only to prevent account enumeration
    const hashToCompare = user?.password || DUMMY_BCRYPT_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);
    if (!user || !user.password || !isValid) {
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

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as { id?: string; typ?: string; tv?: number };

    if (!decoded?.id || (decoded.typ && decoded.typ !== 'refresh')) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!session || session.userId !== decoded.id) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (typeof decoded.tv === 'number' && decoded.tv !== session.user.tokenVersion) {
      await prisma.session.deleteMany({ where: { userId: session.userId } }).catch(() => {});
      return res.status(401).json({ error: 'Session invalidated. Please sign in again.' });
    }

    const tokens = generateTokens(session.user);

    // Atomically rotate refresh token only if the old token still matches
    const rotated = await prisma.session.updateMany({
      where: { id: session.id, token: refreshToken },
      data: {
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      }
    });

    if (rotated.count === 0) {
      return res.status(401).json({ error: 'Refresh token already rotated. Please sign in again.' });
    }

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

    const updated = await prisma.user.updateMany({
      where: { id: user.id, verificationToken: token, emailVerified: false },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        ...(shouldBeAdmin ? { role: 'ADMIN', serverLimit: Math.max(user.serverLimit, 100) } : {}),
      },
    });

    if (updated.count === 0) {
      return res.status(400).json({ error: 'Email already verified or token expired' });
    }

    invalidateUserAuthCache(user.id);

    // Release any pending referral rewards now that email ownership is verified
    const referralResult = await completePendingReferral(user.id).catch((err) => {
      logger.error({ err, userId: user.id }, 'Failed to complete pending referral');
      return { success: false };
    });

    // Send welcome email once upon successful verification
    sendWelcomeEmail(
      user.email,
      user.name || user.username,
      referralResult.success ? REFEREE_REWARD_CREDITS : 0
    ).catch((err) => {
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

    const delivered = await sendVerificationEmail(user.email, verificationToken);
    if (!delivered && env.SMTP_HOST) {
      return res.status(503).json({ error: 'Failed to deliver verification email. Please try again shortly.' });
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error({ error }, 'Resend verification error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (authenticated) - rotates tokenVersion & invalidates prior sessions
router.post('/change-password', requireAuth, tokenLimiter, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be between 6 and 128 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.password) {
      if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length > 128) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    await prisma.session.deleteMany({ where: { userId: user.id } });
    await revokeTokenJti(req.user?.jti, req.user?.exp);
    invalidateUserAuthCache(user.id);
    disconnectUserSockets(user.id);

    const tokens = generateTokens(updatedUser);
    await prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      message: 'Password updated and other active sessions revoked',
      ...tokens,
    });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password - sends 1-hour reset link without leaking account existence
router.post('/forgot-password', resendLimiter, async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, username: true },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: tokenHash,
          resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      sendPasswordResetEmail(user.email, user.name || user.username, rawToken).catch((err) => {
        logger.error({ err }, 'Failed to send password reset email');
      });
    }

    res.json({
      message: 'If an account exists for that email address, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error({ error }, 'Forgot password error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password - consumes hashed reset token and revokes all sessions
router.post('/reset-password', tokenLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: tokenHash },
      select: { id: true, resetPasswordExpiry: true },
    });

    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired password reset link' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, resetPasswordToken: tokenHash },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        emailVerified: true,
        tokenVersion: { increment: 1 },
      },
    });

    if (consumed.count === 0) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    await prisma.session.deleteMany({ where: { userId: user.id } });
    invalidateUserAuthCache(user.id);
    disconnectUserSockets(user.id);

    res.json({ success: true, message: 'Password has been reset successfully. You can now sign in.' });
  } catch (error) {
    logger.error({ error }, 'Reset password error');
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
      select: { id: true, email: true, username: true, role: true, emailVerified: true, tokenVersion: true },
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
    const { refreshToken, all } = req.body || {};
    await revokeTokenJti(req.user?.jti, req.user?.exp);
    invalidateUserAuthCache(req.user!.id);

    if (all === true) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { tokenVersion: { increment: 1 } },
      }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: req.user!.id } });
      disconnectUserSockets(req.user!.id);
    } else if (refreshToken && typeof refreshToken === 'string') {
      await prisma.session.deleteMany({
        where: { token: refreshToken, userId: req.user!.id },
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ error }, 'Logout error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
