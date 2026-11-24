export const RESERVED_PROJECT_NAMES = new Set<string>([
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'cdn',
  'codehost',
  'console',
  'control',
  'cpanel',
  'dashboard',
  'db',
  'dev',
  'docs',
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
  'mysql',
  'ns1',
  'ns2',
  'oauth',
  'panel',
  'pop',
  'postgres',
  'postgresql',
  'prometheus',
  'proxy',
  'redis',
  'root',
  'signup',
  'smtp',
  'ssh',
  'ssl',
  'staging',
  'static',
  'status',
  'support',
  'system',
  'test',
  'vpn',
  'webhook',
  'webhooks',
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

export function sanitizeUserEnvVars(envVars: unknown): Record<string, string> {
  if (!envVars || typeof envVars !== 'object' || Array.isArray(envVars)) {
    return {};
  }

  const sanitized: Record<string, string> = {};
  for (const [rawKey, rawVal] of Object.entries(envVars)) {
    const key = rawKey.trim();
    if (!ENV_KEY_REGEX.test(key)) continue;
    if (isReservedContainerEnvKey(key)) continue;
    if (rawVal === undefined || rawVal === null) continue;
    sanitized[key] = String(rawVal).replace(/[\r\n]+/g, '');
  }

  return sanitized;
}
