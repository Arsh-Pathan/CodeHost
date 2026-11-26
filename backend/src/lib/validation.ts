import fs from 'fs-extra';
import path from 'path';

export const RESERVED_PROJECT_NAMES = new Set<string>([
  'accounts',
  'account',
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'autoconfig',
  'autodiscover',
  'billing',
  'cdn',
  'certificate',
  'certificates',
  'checkout',
  'codehost',
  'console',
  'control',
  'cpanel',
  'dashboard',
  'db',
  'dev',
  'docs',
  'files',
  'ftp',
  'git',
  'grafana',
  'health',
  'host',
  'imap',
  'localhost',
  'login',
  'logs',
  'mail',
  'mcp',
  'metrics',
  'monitor',
  'mta-sts',
  'mysql',
  'ns1',
  'ns2',
  'oauth',
  'panel',
  'pay',
  'payments',
  'pop',
  'postgres',
  'postgresql',
  'postmaster',
  'prometheus',
  'proxy',
  'redis',
  'registry',
  'root',
  'security',
  'signup',
  'smtp',
  'ssh',
  'ssl',
  'sso',
  'staging',
  'static',
  'status',
  'storage',
  'support',
  'system',
  'test',
  'verify',
  'vpn',
  'webhook',
  'webhooks',
  'webmail',
  'wpad',
  'ws',
  'www',
]);

export const RESERVED_CONTAINER_ENV_KEYS = new Set<string>([
  'CERT_NAME',
  'DEFAULT_HOST',
  'HTTPS_METHOD',
  'LETSENCRYPT_EMAIL',
  'LETSENCRYPT_HOST',
  'LETSENCRYPT_TEST',
  'VIRTUAL_DEST',
  'VIRTUAL_HOST',
  'VIRTUAL_NETWORK',
  'VIRTUAL_PATH',
  'VIRTUAL_PORT',
  'VIRTUAL_PROTO',
]);

const PROJECT_NAME_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const DOMAIN_HOSTNAME_REGEX = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const ENV_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface ProjectNameValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export function validateProjectName(rawName: unknown): ProjectNameValidationResult {
  if (typeof rawName !== 'string') {
    return { valid: false, normalized: '', error: 'Project name must be a string' };
  }

  const normalized = rawName.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 50) {
    return {
      valid: false,
      normalized,
      error: 'Project name must be between 3 and 50 characters',
    };
  }

  if (!PROJECT_NAME_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Name must use lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
    };
  }

  if (RESERVED_PROJECT_NAMES.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `"${normalized}" is a reserved platform subdomain`,
    };
  }

  return { valid: true, normalized };
}

export interface CustomDomainValidationResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

export function validateCustomDomain(
  rawDomain: unknown,
  platformDomain = process.env.DOMAIN || 'code-host.online'
): CustomDomainValidationResult {
  if (rawDomain === null || rawDomain === undefined) {
    return { valid: true, normalized: null };
  }

  if (typeof rawDomain !== 'string') {
    return { valid: false, normalized: null, error: 'Custom domain must be a string' };
  }

  const trimmed = rawDomain.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { valid: true, normalized: null };
  }

  if (/[\s,/:\\]/.test(trimmed) || trimmed.includes('://')) {
    return {
      valid: false,
      normalized: null,
      error: 'Custom domain must be a plain hostname (e.g. app.example.com) without protocol, path, or port',
    };
  }

  const cleaned = trimmed.replace(/\.$/, '');
  if (!DOMAIN_HOSTNAME_REGEX.test(cleaned)) {
    return {
      valid: false,
      normalized: null,
      error: 'Invalid custom domain hostname format',
    };
  }

  const normalizedPlatform = platformDomain.trim().toLowerCase().replace(/\.$/, '');
  if (
    cleaned === 'localhost' ||
    cleaned.endsWith('.localhost') ||
    cleaned === normalizedPlatform ||
    cleaned.endsWith(`.${normalizedPlatform}`)
  ) {
    return {
      valid: false,
      normalized: null,
      error: `Cannot attach a ${normalizedPlatform} or localhost hostname as a custom domain`,
    };
  }

  return { valid: true, normalized: cleaned };
}

export function isReservedContainerEnvKey(key: string): boolean {
  const upper = key.trim().toUpperCase();
  return (
    RESERVED_CONTAINER_ENV_KEYS.has(upper) ||
    upper.startsWith('VIRTUAL_') ||
    upper.startsWith('LETSENCRYPT_')
  );
}

const WINDOWS_RESERVED_BASENAMES = new Set<string>([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

function normalizeDriveCase(p: string): string {
  if (process.platform === 'win32' && /^[a-zA-Z]:/.test(p)) {
    return p[0].toUpperCase() + p.slice(1);
  }
  return p;
}

export function sanitizeUserEnvVars(envVars: unknown): Record<string, string> {
  if (!envVars || typeof envVars !== 'object' || Array.isArray(envVars)) {
    return {};
  }

  const sanitized: Record<string, string> = {};
  let totalBytes = 0;
  let keyCount = 0;

  for (const [rawKey, rawVal] of Object.entries(envVars)) {
    if (keyCount >= 100) break;
    const key = rawKey.trim();
    if (key.length > 128 || !ENV_KEY_REGEX.test(key)) continue;
    if (isReservedContainerEnvKey(key)) continue;
    if (rawVal === undefined || rawVal === null) continue;

    const cleanVal = String(rawVal).replace(/[\r\n\0]+/g, '').slice(0, 16384);
    const entryBytes = key.length + cleanVal.length + 2;
    if (totalBytes + entryBytes > 65536) break;

    sanitized[key] = cleanVal;
    totalBytes += entryBytes;
    keyCount++;
  }

  return sanitized;
}

export interface GithubRepoInputResult {
  valid: boolean;
  repoUrl: string;
  branch: string;
  subdir?: string;
  error?: string;
}

export function validateGithubRepoInput(input: {
  repoUrl?: unknown;
  branch?: unknown;
  subdir?: unknown;
}): GithubRepoInputResult {
  if (typeof input.repoUrl !== 'string' || !input.repoUrl.trim()) {
    return { valid: false, repoUrl: '', branch: 'main', error: 'GitHub repository URL is required' };
  }

  const trimmedUrl = input.repoUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return { valid: false, repoUrl: '', branch: 'main', error: 'Invalid repository URL format' };
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname.toLowerCase() !== 'github.com' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash ||
    !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(parsed.pathname)
  ) {
    return {
      valid: false,
      repoUrl: '',
      branch: 'main',
      error: 'Must be a clean https://github.com/<owner>/<repo> URL without credentials or query strings',
    };
  }

  const cleanRepoUrl = `https://github.com${parsed.pathname.replace(/\/+$/, '')}`;

  const rawBranch = typeof input.branch === 'string' && input.branch.trim() ? input.branch.trim() : 'main';
  if (
    rawBranch.length > 100 ||
    rawBranch.startsWith('-') ||
    rawBranch.startsWith('/') ||
    rawBranch.endsWith('/') ||
    rawBranch.endsWith('.lock') ||
    rawBranch.includes('..') ||
    rawBranch.includes('//') ||
    !/^[A-Za-z0-9._/-]+$/.test(rawBranch)
  ) {
    return {
      valid: false,
      repoUrl: cleanRepoUrl,
      branch: 'main',
      error: 'Invalid Git branch name',
    };
  }

  let cleanSubdir: string | undefined;
  if (input.subdir !== undefined && input.subdir !== null && String(input.subdir).trim() !== '') {
    if (typeof input.subdir !== 'string') {
      return { valid: false, repoUrl: cleanRepoUrl, branch: rawBranch, error: 'Subdirectory must be a string' };
    }
    const sub = input.subdir.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (
      !sub ||
      sub.length > 200 ||
      sub.includes('\0') ||
      sub.includes('..') ||
      sub.startsWith('-') ||
      sub.split('/').some((seg) => seg === '.' || seg === '..' || seg.startsWith('-'))
    ) {
      return { valid: false, repoUrl: cleanRepoUrl, branch: rawBranch, error: 'Invalid repository subdirectory path' };
    }
    cleanSubdir = sub;
  }

  return { valid: true, repoUrl: cleanRepoUrl, branch: rawBranch, subdir: cleanSubdir };
}

/**
 * Resolve a relative path inside a project workspace directory securely.
 * Rejects root references ("."), path traversal, absolute/drive paths, null bytes,
 * Windows reserved device names, existing symlinks, symlinked ancestors, and dangling symlinks.
 */
export async function resolveSafeProjectPath(baseDir: string, relativePath: string): Promise<string> {
  if (!relativePath || typeof relativePath !== 'string' || relativePath.includes('\0')) {
    throw new Error('Invalid file path');
  }

  if (/^[A-Za-z]:/.test(relativePath)) {
    throw new Error('Forbidden path: traversal outside project directory');
  }

  const normalizedRel = relativePath.replace(/^[/\\]+/, '');
  if (!normalizedRel) {
    throw new Error('File path cannot be empty');
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, normalizedRel);

  if (resolvedPath === resolvedBase) {
    throw new Error('Forbidden path: cannot target project root directory');
  }
  if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
    throw new Error('Forbidden path: traversal outside project directory');
  }

  const realBase = normalizeDriveCase(await fs.realpath(resolvedBase).catch(() => resolvedBase));
  const relativeFromBase = path.relative(resolvedBase, resolvedPath);
  const segments = relativeFromBase.split(path.sep).filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Forbidden path: cannot target project root directory');
  }

  for (const segment of segments) {
    const stem = segment.split('.')[0].toUpperCase();
    if (WINDOWS_RESERVED_BASENAMES.has(stem)) {
      throw new Error('Invalid file path: reserved device filename is not allowed');
    }
  }

  let currentPath = resolvedBase;
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    try {
      const lstats = await fs.lstat(currentPath);
      if (lstats.isSymbolicLink()) {
        throw new Error('Forbidden path: symlink escapes project root');
      }
      const realCurrent = normalizeDriveCase(await fs.realpath(currentPath));
      if (!realCurrent.startsWith(realBase + path.sep) && realCurrent !== realBase) {
        throw new Error('Forbidden path: symlink escapes project root');
      }
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        continue;
      }
      throw err;
    }
  }

  return resolvedPath;
}
