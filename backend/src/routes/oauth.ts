import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '@codehost/database';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';
import { generateTokens } from './auth.js';
import { sendWelcomeEmail } from '../lib/email.js';
import {
  completePendingReferral,
  generateUniqueReferralCode,
  isConfiguredAdminEmail,
  processReferralReward,
  REFEREE_REWARD_CREDITS,
} from '../services/referral.js';

const router = Router();
const OAUTH_STATE_COOKIE = 'codehost_oauth_state';

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many OAuth attempts, please try again later.' },
});

router.use(oauthLimiter);

// --- Helpers ---

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

function createStateToken(state: string, ref?: string): string {
  return jwt.sign({ state, ref: ref || null, typ: 'oauth_state' }, env.JWT_SECRET, { expiresIn: '15m' });
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

function setOAuthStateCookie(res: any, state: string) {
  const secureFlag = env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; HttpOnly; Path=/auth/oauth; Max-Age=900; SameSite=Lax${secureFlag}`
  );
}

function clearOAuthStateCookie(res: any) {
  const secureFlag = env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${OAUTH_STATE_COOKIE}=; HttpOnly; Path=/auth/oauth; Max-Age=0; SameSite=Lax${secureFlag}`
  );
}

function verifyStateBinding(req: any, res: any, token: string, expectedState: string): { valid: boolean; ref?: string | null } {
  const cookies = parseCookies(req.headers?.cookie);
  const cookieState = cookies[OAUTH_STATE_COOKIE] || '';
  clearOAuthStateCookie(res);

  if (!cookieState || !expectedState || cookieState.length !== expectedState.length) {
    return { valid: false };
  }
  const cookieMatches = crypto.timingSafeEqual(Buffer.from(cookieState), Buffer.from(expectedState));
  if (!cookieMatches) {
    return { valid: false };
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as {
      state: string;
      ref?: string | null;
      typ?: string;
    };
    if (decoded.typ && decoded.typ !== 'oauth_state') return { valid: false };
    if (decoded.state !== expectedState) return { valid: false };
    return { valid: true, ref: decoded.ref || null };
  } catch {
    return { valid: false };
  }
}

async function generateUniqueUsername(email: string, name: string | null): Promise<string> {
  // Use name if available and NOT an email address, else fallback to email prefix
  const emailPrefix = (email.split('@')[0] || 'user').replace(/[^a-z0-9_-]/g, '');
  let base = (name && !name.includes('@') ? name : emailPrefix)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

  if (base.length < 2) base = emailPrefix.length >= 2 ? emailPrefix : `${base || 'u'}0`;

  const sanitized = base.slice(0, 20).padEnd(2, '0');

  const existing = await prisma.user.findUnique({ where: { username: sanitized } });
  if (!existing) return sanitized;

  const suffix = crypto.randomBytes(3).toString('hex');
  return `${sanitized.slice(0, 14)}-${suffix}`;
}

async function findOrCreateOAuthUser(
  provider: string,
  providerId: string,
  rawEmail: string,
  name: string | null,
  avatarUrl: string | null = null,
  referralCode: string | null = null
) {
  const email = rawEmail.trim().toLowerCase();

  // 1. Look up by provider + providerId
  let user = await prisma.user.findFirst({
    where: { provider, providerId },
  });
  if (user) {
    if (avatarUrl && user.avatarUrl !== avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    }
    return user;
  }

  // 2. Look up by verified email (case-insensitive to guard pre-account takeover)
  user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (user) {
    const wasUnverified = !user.emailVerified;
    const promoteAdmin = wasUnverified && isConfiguredAdminEmail(email);
    const shouldLinkProvider = !user.provider && !user.providerId;

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        ...(shouldLinkProvider || wasUnverified ? { provider, providerId } : {}),
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        ...(wasUnverified ? { password: null, tokenVersion: { increment: 1 } } : {}),
        ...(promoteAdmin ? { role: 'ADMIN', serverLimit: Math.max(user.serverLimit, 100) } : {}),
        ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
      },
    });
    if (wasUnverified) {
      await prisma.session.deleteMany({ where: { userId: user.id } });
      const refResult = await completePendingReferral(user.id).catch(() => ({ success: false }));
      sendWelcomeEmail(email, user.name || user.username, refResult.success ? REFEREE_REWARD_CREDITS : 0).catch(() => {});
    }
    return user;
  }

  // 3. Create new user (retry username collisions safely)
  const isAdmin = isConfiguredAdminEmail(email);
  for (let attempt = 0; attempt < 5; attempt++) {
    const username =
      attempt === 0
        ? await generateUniqueUsername(email, name)
        : `user-${crypto.randomBytes(4).toString('hex')}`;
    const myReferralCode = await generateUniqueReferralCode(username);
    try {
      user = await prisma.user.create({
        data: {
          email,
          username,
          name,
          avatarUrl,
          provider,
          providerId,
          emailVerified: true,
          password: null,
          role: isAdmin ? 'ADMIN' : 'USER',
          serverLimit: isAdmin ? 100 : 1,
          referralCode: myReferralCode,
        },
      });
      break;
    } catch (err: any) {
      if (err?.code === 'P2002' && attempt < 4) {
        continue;
      }
      throw err;
    }
  }

  if (!user) {
    throw new Error('Failed to create OAuth user');
  }

  if (referralCode) {
    await processReferralReward(user.id, referralCode);
  }

  return user;
}

async function handleOAuthSuccess(res: any, user: any) {
  const { accessToken, refreshToken } = generateTokens(user);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  // Pass tokens in URL hash fragment so they are never sent in HTTP Referer headers or access logs
  const params = new URLSearchParams({ accessToken, refreshToken });
  res.redirect(`${env.APP_URL}/auth/callback#${params.toString()}`);
}

// --- Google OAuth ---

router.get('/google', (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }

  const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined;
  const state = generateState();
  const stateToken = createStateToken(state, ref);
  setOAuthStateCookie(res, state);

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

    // Verify double-submit CSRF state cookie + signed JWT
    const colonIdx = stateParam.indexOf(':');
    const state = colonIdx > 0 ? stateParam.slice(0, colonIdx) : '';
    const stateToken = colonIdx > 0 ? stateParam.slice(colonIdx + 1) : '';
    const verification = verifyStateBinding(req, res, stateToken, state);
    if (!state || !stateToken || !verification.valid) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${env.API_URL}/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      logger.error({ status: tokenRes.status, tokenData }, 'Google OAuth: no id_token');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Decode id_token (returned directly over TLS from https://oauth2.googleapis.com/token)
    const payload = JSON.parse(
      Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString()
    );

    if (payload.iss && payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      logger.warn({ iss: payload.iss }, 'Google OAuth: issuer mismatch');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 60_000) {
      logger.warn({ exp: payload.exp }, 'Google OAuth: expired id_token');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    if (!payload.sub || (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID)) {
      logger.warn({ aud: payload.aud }, 'Google OAuth: audience or sub mismatch');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    const { email, email_verified, name, sub, picture } = payload;
    if (!email) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_no_email`);
    }

    if (email_verified !== true && email_verified !== 'true') {
      logger.warn({ email }, 'Google OAuth: unverified email rejected');
      return res.redirect(`${env.APP_URL}/login?error=oauth_unverified_email`);
    }

    const user = await findOrCreateOAuthUser('google', sub, email, name || null, picture || null, verification.ref);
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

  const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined;
  const state = generateState();
  const stateToken = createStateToken(state, ref);
  setOAuthStateCookie(res, state);

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

    const colonIdx = stateParam.indexOf(':');
    const state = colonIdx > 0 ? stateParam.slice(0, colonIdx) : '';
    const stateToken = colonIdx > 0 ? stateParam.slice(colonIdx + 1) : '';
    const verification = verifyStateBinding(req, res, stateToken, state);
    if (!state || !stateToken || !verification.valid) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
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
      fetch('https://api.github.com/user', { headers: ghHeaders, signal: AbortSignal.timeout(10_000) }),
      fetch('https://api.github.com/user/emails', { headers: ghHeaders, signal: AbortSignal.timeout(10_000) }),
    ]);

    const profile: any = await profileRes.json();
    const emailsRaw: any = await emailsRes.json();
    if (!profileRes.ok || !emailsRes.ok) {
      logger.error({ profileStatus: profileRes.status, emailsStatus: emailsRes.status }, 'GitHub OAuth profile/emails fetch failed');
      return res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }

    const emails: { email: string; primary: boolean; verified: boolean }[] = Array.isArray(emailsRaw) ? emailsRaw : [];

    // Only trust GitHub-verified email addresses to prevent unverified email takeover
    const primaryEmail =
      emails.find((e) => e.primary && e.verified)?.email ||
      emails.find((e) => e.verified)?.email;

    if (!primaryEmail || !profile?.id) {
      return res.redirect(`${env.APP_URL}/login?error=oauth_unverified_email`);
    }

    const user = await findOrCreateOAuthUser(
      'github',
      String(profile.id),
      primaryEmail,
      profile.name || profile.login || null,
      profile.avatar_url || null,
      verification.ref
    );
    await handleOAuthSuccess(res, user);
  } catch (error) {
    logger.error({ error }, 'GitHub OAuth callback error');
    res.redirect(`${env.APP_URL}/login?error=oauth_failed`);
  }
});

export default router;
