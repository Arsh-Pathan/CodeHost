import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {
  validateProjectName,
  validateCustomDomain,
  sanitizeUserEnvVars,
} from '../src/lib/validation.js';
import {
  BuilderService,
  CODEHOST_DOCKERFILE_HEADER,
} from '../src/services/builder.js';
import { resolveVerifiedOrderGrant } from '../src/routes/billing.js';

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codehost-test-'));
  try {
    await fn(dir);
  } finally {
    await fs.remove(dir).catch(() => {});
  }
}

test('validateProjectName enforces DNS-safe slugs and blocks reserved platform subdomains', () => {
  const valid = validateProjectName('My-Cool-App-1');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, 'my-cool-app-1');

  for (const reserved of ['api', 'www', 'admin', 'mcp', 'billing', 'auth', 'redis', 'postgres', 'codehost', 'dashboard']) {
    const res = validateProjectName(reserved);
    assert.equal(res.valid, false, `Expected "${reserved}" to be rejected`);
  }

  assert.equal(validateProjectName('ab').valid, false);
  assert.equal(validateProjectName('-leading').valid, false);
  assert.equal(validateProjectName('trailing-').valid, false);
  assert.equal(validateProjectName('bad_underscore').valid, false);
});

test('validateCustomDomain allows external hostnames and blocks platform domain hijacking', () => {
  assert.deepEqual(validateCustomDomain(''), { valid: true, normalized: null });
  assert.deepEqual(validateCustomDomain(null), { valid: true, normalized: null });

  const ok = validateCustomDomain('App.Example.COM.');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'app.example.com');

  for (const bad of [
    'code-host.online',
    'api.code-host.online',
    'another-project.code-host.online',
    'localhost',
    'app.localhost',
    'https://example.com',
    'example.com/path',
    'example.com:8080',
    'one.example.com,two.example.com',
    'invalid',
  ]) {
    const res = validateCustomDomain(bad, 'code-host.online');
    assert.equal(res.valid, false, `Expected "${bad}" to be rejected`);
  }
});

test('sanitizeUserEnvVars strips proxy/TLS override keys and newline injection', () => {
  const clean = sanitizeUserEnvVars({
    DATABASE_URL: 'postgres://db/app\nRUN evil',
    VIRTUAL_HOST: 'api.code-host.online',
    virtual_port: '8080',
    LETSENCRYPT_HOST: 'code-host.online',
    LETSENCRYPT_EMAIL: 'attacker@evil.com',
    CERT_NAME: 'default',
    HTTPS_METHOD: 'noredirect',
    '123INVALID': 'x',
    API_KEY: 'secret_123',
  });

  assert.equal(clean.API_KEY, 'secret_123');
  assert.equal(clean.DATABASE_URL, 'postgres://db/appRUN evil');
  assert.equal('VIRTUAL_HOST' in clean, false);
  assert.equal('virtual_port' in clean, false);
  assert.equal('LETSENCRYPT_HOST' in clean, false);
  assert.equal('LETSENCRYPT_EMAIL' in clean, false);
  assert.equal('CERT_NAME' in clean, false);
  assert.equal('HTTPS_METHOD' in clean, false);
  assert.equal('123INVALID' in clean, false);
});

test('BuilderService.cmdFrom safely encodes quotes, newlines, and JSON array CMDs', () => {
  assert.equal(
    BuilderService.cmdFrom('echo "hello world"'),
    'CMD ["sh","-c","echo \\"hello world\\""]'
  );

  assert.equal(
    BuilderService.cmdFrom('node server.js\nRUN rm -rf /'),
    'CMD ["sh","-c","node server.js RUN rm -rf /"]'
  );

  assert.equal(
    BuilderService.cmdFrom('["node", "server.js"]'),
    'CMD ["node","server.js"]'
  );
});

test('BuilderService.detectAndGenerateDockerfile re-detects auto-generated Dockerfiles without duplicating ENV lines', async () => {
  await withTempDir(async (dir) => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      name: 'demo-api',
      scripts: { start: 'node index.js' },
      dependencies: { express: '^4.21.0' },
    });

    const first = await BuilderService.detectAndGenerateDockerfile(dir, {
      startCommand: 'node first.js',
      envVars: { FOO: 'one', VIRTUAL_HOST: 'hijack.code-host.online' },
    });
    assert.ok(first.startsWith(CODEHOST_DOCKERFILE_HEADER));
    assert.ok(first.includes('node first.js'));
    assert.ok(first.includes('ENV FOO="one"'));
    assert.equal(first.includes('VIRTUAL_HOST'), false);

    // Re-run on the same directory after changing startCommand and envVars
    const second = await BuilderService.detectAndGenerateDockerfile(dir, {
      startCommand: 'node second.js',
      envVars: { FOO: 'two' },
    });
    assert.ok(second.includes('node second.js'));
    assert.equal(second.includes('node first.js'), false);
    assert.equal(second.match(/ENV FOO=/g)?.length, 1);
    assert.ok(second.includes('ENV FOO="two"'));
  });
});

test('BuilderService preserves genuine user-authored Dockerfiles', async () => {
  await withTempDir(async (dir) => {
    const custom = 'FROM alpine:3.20\nCMD ["echo", "custom"]\n';
    await fs.writeFile(path.join(dir, 'Dockerfile'), custom);
    await fs.writeJson(path.join(dir, 'package.json'), { dependencies: { express: '^4.21.0' } });

    const out = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.equal(out.startsWith(CODEHOST_DOCKERFILE_HEADER), false);
    assert.ok(out.includes('FROM alpine:3.20'));
    assert.ok(out.includes('CMD ["echo", "custom"]'));
  });
});

test('BuilderService handles Next.js standard vs standalone, Vite SPA routing, Go tidy, and .NET assembly DLLs', async () => {
  await withTempDir(async (dir) => {
    // 1. Standard Next.js (no standalone)
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { next: '15.0.0', react: '19.0.0' },
      scripts: { build: 'next build', start: 'next start' },
    });
    const nextStd = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.equal(nextStd.includes('.next/standalone'), false);
    assert.ok(nextStd.includes('npm start'));

    // 2. Standalone Next.js ensures public dir exists
    await fs.writeFile(path.join(dir, 'next.config.mjs'), 'export default { output: "standalone" };');
    const nextStandalone = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.ok(nextStandalone.includes('mkdir -p public'));
    assert.ok(nextStandalone.includes('.next/standalone'));
    assert.ok(nextStandalone.includes('node server.js'));
  });

  await withTempDir(async (dir) => {
    // Vite SPA gets try_files routing rule
    await fs.writeJson(path.join(dir, 'package.json'), {
      devDependencies: { vite: '^5.0.0' },
      scripts: { build: 'vite build' },
    });
    const viteDf = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.ok(viteDf.includes('try_files $uri $uri/ /index.html'));
  });

  await withTempDir(async (dir) => {
    // Go repo without go.sum runs go mod tidy
    await fs.writeFile(path.join(dir, 'go.mod'), 'module demo\n\ngo 1.22\n');
    const goDf = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.ok(goDf.includes('go mod tidy'));
  });

  await withTempDir(async (dir) => {
    // .NET uses .csproj name for entry DLL
    await fs.writeFile(path.join(dir, 'MyStudentApi.csproj'), '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>');
    const dotnetDf = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.ok(dotnetDf.includes('dotnet MyStudentApi.dll'));
  });
});

test('resolveVerifiedOrderGrant blocks cross-user claims and derives grants strictly from Razorpay order', () => {
  const crossUser = resolveVerifiedOrderGrant(
    { amount: 8000, notes: { userId: 'user-owner', credits: '50' } },
    'attacker-user'
  );
  assert.equal(crossUser.ok, false);
  assert.equal(crossUser.status, 403);

  // Insufficient order amount cannot activate Hackathon Pass even if notes were forged low
  const underpaidHackathon = resolveVerifiedOrderGrant(
    { amount: 1600, notes: { userId: 'u1', planType: 'hackathon', credits: '10' } },
    'u1'
  );
  assert.equal(underpaidHackathon.ok, true);
  assert.equal(underpaidHackathon.isHackathon, false);
  assert.equal(underpaidHackathon.creditsToAdd, 10);

  // Genuine ₹49 Hackathon Pass activates Pro + 50 credits
  const validHackathon = resolveVerifiedOrderGrant(
    { amount: 4900, notes: { userId: 'u1', planType: 'hackathon', credits: '50' } },
    'u1'
  );
  assert.equal(validHackathon.ok, true);
  assert.equal(validHackathon.isHackathon, true);
  assert.equal(validHackathon.creditsToAdd, 50);

  // Missing notes falls back strictly to order amount in paise (₹160 -> 100 credits)
  const amountFallback = resolveVerifiedOrderGrant(
    { amount: 16000, notes: { userId: 'u1' } },
    'u1'
  );
  assert.equal(amountFallback.ok, true);
  assert.equal(amountFallback.isHackathon, false);
  assert.equal(amountFallback.creditsToAdd, 100);
});
