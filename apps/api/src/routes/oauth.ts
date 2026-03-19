import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@codehost/database';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';
import { generateTokens } from './auth.js';

const router = Router();

// --- Helpers ---

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

function createStateToken(state: string): string {
  return jwt.sign({ state }, env.JWT_SECRET, { expiresIn: '10m' });
}

function verifyStateToken(token: string, expectedState: string): boolean {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { state: string };
    return decoded.state === expectedState;
  } catch {
    return false;
  }
}

async function generateUniqueUsername(base: string): Promise<string> {
  const sanitized = base.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'user';
  const existing = await prisma.user.findUnique({ where: { username: sanitized } });
  if (!existing) return sanitized;
  // Add random suffix
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${sanitized.slice(0, 14)}-${suffix}`;
}

async function findOrCreateOAuthUser(
  provider: string,
  providerId: string,
  email: string,
  name: string | null
) {
  // 1. Look up by provider + providerId
  let user = await prisma.user.findFirst({
    where: { provider, providerId },
  });
  if (user) return user;

  // 2. Look up by email (auto-link)
  user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { provider, providerId, emailVerified: true },
    });
    return user;
  }

  // 3. Create new user
  const username = await generateUniqueUsername(email.split('@')[0]!);
  user = await prisma.user.create({
    data: {
      email,
      username,
      name,
      provider,
      providerId,
      emailVerified: true,
      password: null,
    },
  });
  return user;
}

async function handleOAuthSuccess(res: any, user: any) {
  const { accessToken, refreshToken } = generateTokens(user);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const params = new URLSearchParams({ accessToken, refreshToken });
  res.redirect(`${env.APP_URL}/auth/callback?${params.toString()}`);
}

// --- Google OAuth ---

router.get('/google', (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }

  const state = generateState();
  const stateToken = createStateToken(state);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.API_URL}/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'consent',
    state: `${state}:${stateToken}`,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code || !stateParam || typeof code !== 'string' || typeof stateParam !== 'string') {
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Verify CSRF state
    const [state, stateToken] = stateParam.split(':');
    if (!state || !stateToken || !verifyStateToken(stateToken, state)) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${env.API_URL}/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      logger.error({ tokenData }, 'Google OAuth: no id_token');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Decode id_token (JWT payload is base64url-encoded)
    const payload = JSON.parse(
      Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString()
    );

    const { email, name, sub } = payload;
    if (!email) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_no_email`);
    }

    const user = await findOrCreateOAuthUser('google', sub, email, name || null);
    await handleOAuthSuccess(res, user);
  } catch (error) {
    logger.error({ error }, 'Google OAuth callback error');
    res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
  }
});

// --- GitHub OAuth ---

router.get('/github', (req, res) => {
  if (!env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: 'GitHub OAuth not configured' });
  }

  const state = generateState();
  const stateToken = createStateToken(state);

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.API_URL}/auth/oauth/github/callback`,
    scope: 'user:email',
    state: `${state}:${stateToken}`,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get('/github/callback', async (req, res) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code || !stateParam || typeof code !== 'string' || typeof stateParam !== 'string') {
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    const [state, stateToken] = stateParam.split(':');
    if (!state || !stateToken || !verifyStateToken(stateToken, state)) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${env.API_URL}/auth/oauth/github/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      logger.error({ tokenData }, 'GitHub OAuth: no access_token');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    const ghHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/json',
      'User-Agent': 'CodeHost',
    };

    // Fetch user profile
    const [profileRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers: ghHeaders }),
      fetch('https://api.github.com/user/emails', { headers: ghHeaders }),
    ]);

    const profile = await profileRes.json();
    const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json();

    const primaryEmail = emails.find((e) => e.primary && e.verified)?.email
      || emails.find((e) => e.verified)?.email;

    if (!primaryEmail) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_no_email`);
    }

    const user = await findOrCreateOAuthUser(
      'github',
      String(profile.id),
      primaryEmail,
      profile.name || profile.login || null
    );
    await handleOAuthSuccess(res, user);
  } catch (error) {
    logger.error({ error }, 'GitHub OAuth callback error');
    res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
  }
});

export default router;
