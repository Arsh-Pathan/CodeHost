import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { createDockerLogDemuxer } from '@codehost/docker';
import {
  resolveSafeProjectPath,
  validateGithubRepoInput,
} from '../src/lib/validation.js';
import { resolveVerifiedOrderGrant } from '../src/routes/billing.js';
import { BuilderService } from '../src/services/builder.js';
import { parseProcNetTcpPorts } from '../src/services/runner.js';
import { sendPasswordResetEmail } from '../src/lib/email.js';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codehost-audit3-'));
  try {
    await fn(dir);
  } finally {
    await fs.remove(dir).catch(() => {});
  }
}

test('resolveSafeProjectPath rejects root references, dot segments, and Windows reserved device names', async () => {
  await withTempDir(async (dir) => {
    const valid = await resolveSafeProjectPath(dir, 'src/app.ts');
    assert.equal(valid, path.resolve(dir, 'src/app.ts'));

    for (const badPath of ['.', './', 'sub/..', 'CON', 'nul.txt', 'dir/COM1.json', 'lpt1']) {
      await assert.rejects(
        () => resolveSafeProjectPath(dir, badPath),
        /Invalid|Forbidden|reserved|traversal/i,
        `Expected "${badPath}" to be rejected`
      );
    }
  });
});

test('validateGithubRepoInput blocks SSRF/credentials/git-option injection and accepts valid GitHub specs', () => {
  const valid = validateGithubRepoInput({
    repoUrl: 'https://github.com/Arsh-Pathan/CodeHost.git/',
    branch: 'main',
    subdir: '/apps/web/',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.repoUrl, 'https://github.com/Arsh-Pathan/CodeHost.git');
  assert.equal(valid.branch, 'main');
  assert.equal(valid.subdir, 'apps/web');

  for (const bad of [
    { repoUrl: 'http://github.com/org/repo', branch: 'main' },
    { repoUrl: 'https://evil.com/org/repo', branch: 'main' },
    { repoUrl: 'https://169.254.169.254/latest/meta-data', branch: 'main' },
    { repoUrl: 'https://user:pass@github.com/org/repo', branch: 'main' },
    { repoUrl: 'https://github.com/org/repo', branch: '--upload-pack=evil' },
    { repoUrl: 'https://github.com/org/repo', branch: 'main', subdir: '../../etc' },
    { repoUrl: 'https://github.com/org/repo', branch: 'main', subdir: '-flag' },
  ]) {
    const res = validateGithubRepoInput(bad);
    assert.equal(res.valid, false, `Expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test('resolveVerifiedOrderGrant rejects non-INR currencies and missing notes.userId with 403', () => {
  const nonInr = resolveVerifiedOrderGrant(
    { amount: 8000, currency: 'IDR', notes: { userId: 'user-1', credits: '50' } },
    'user-1'
  );
  assert.equal(nonInr.ok, false);
  assert.equal(nonInr.status, 400);

  const missingOwner = resolveVerifiedOrderGrant(
    { amount: 8000, currency: 'INR', notes: { credits: '50' } },
    'user-1'
  );
  assert.equal(missingOwner.ok, false);
  assert.equal(missingOwner.status, 403);

  const valid = resolveVerifiedOrderGrant(
    { amount: 8000, currency: 'INR', notes: { userId: 'user-1', credits: '50' } },
    'user-1'
  );
  assert.equal(valid.ok, true);
  assert.equal(valid.creditsToAdd, 50);
});

test('BuilderService strips Dockerfile/.env from Static & PHP webroots, handles bun/PHP/bare Python/Gradle, and omits NODE_ENV in builder', async () => {
  // 1. Static HTML strips sensitive files from /usr/share/nginx/html
  await withTempDir(async (dir) => {
    await fs.writeFile(path.join(dir, 'index.html'), '<h1>Hello</h1>', 'utf8');
    const df = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.match(df, /rm -rf \/usr\/share\/nginx\/html\/Dockerfile/);
    assert.match(df, /\/usr\/share\/nginx\/html\/\.env\*/);
  });

  // 2. Plain PHP without composer.json still detects PHP and strips webroot sensitive files
  await withTempDir(async (dir) => {
    await fs.writeFile(path.join(dir, 'index.php'), '<?php echo "ok"; ?>', 'utf8');
    const df = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.match(df, /FROM php:/);
    assert.equal(df.includes('composer install'), false);
    assert.match(df, /rm -rf \/var\/www\/html\/Dockerfile/);
    assert.match(df, /\/var\/www\/html\/\.env\*/);
  });

  // 3. bun.lock alongside package.json chooses Bun before npm
  await withTempDir(async (dir) => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      name: 'bun-app',
      scripts: { start: 'bun run index.ts' },
    });
    await fs.writeFile(path.join(dir, 'bun.lock'), '', 'utf8');
    const df = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.match(df, /FROM oven\/bun:/);
  });

  // 4. Multi-stage Next.js standalone omits user NODE_ENV from AS builder stage
  await withTempDir(async (dir) => {
    await fs.writeFile(path.join(dir, 'next.config.ts'), 'export default { output: "standalone" };\n', 'utf8');
    await fs.writeJson(path.join(dir, 'package.json'), {
      name: 'next-app',
      dependencies: { next: '15.0.0', react: '19.0.0' },
      scripts: { build: 'next build', start: 'next start' },
    });
    const df = await BuilderService.detectAndGenerateDockerfile(dir, {
      envVars: { NODE_ENV: 'production', PUBLIC_FLAG: 'yes' },
    });
    const builderStage = (df.split('FROM ')[1] || '').split('FROM ')[0];
    assert.ok(builderStage.includes('AS builder'), 'Expected multi-stage AS builder stage');
    assert.equal(builderStage.includes('ENV NODE_ENV='), false, 'AS builder must not inject user NODE_ENV');
    assert.ok(df.includes('ENV NODE_ENV="production"'), 'Production runner stage should receive NODE_ENV');
  });

  // 5. Bare main.py without requirements.txt still builds cleanly
  await withTempDir(async (dir) => {
    await fs.writeFile(path.join(dir, 'main.py'), 'print("hello")\n', 'utf8');
    const df = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.match(df, /FROM python:/);
    assert.match(df, /python main\.py/);
  });

  // 6. Gradle multi-JAR copy excludes *-plain.jar cleanly
  await withTempDir(async (dir) => {
    await fs.writeFile(path.join(dir, 'build.gradle'), 'plugins { id "java" }\n', 'utf8');
    const df = await BuilderService.detectAndGenerateDockerfile(dir, {});
    assert.match(df, /gradle/);
    assert.match(df, /-plain\.jar/);
  });
});

test('parseProcNetTcpPorts ignores loopback/UDP and createDockerLogDemuxer reassembles split UTF-8 frames', () => {
  const procSample = [
    '  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode',
    '   0: 00000000:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 100 1 0000 10 0 0 10 -1', // 0.0.0.0:8080 LISTEN
    '   1: 0100007F:0FA0 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 101 1 0000 10 0 0 10 -1', // 127.0.0.1:4000 LISTEN (skip)
    '   2: 00000000:0035 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 102 1 0000 10 0 0 10 -1', // port 53 DNS (skip)
    '   3: 00000000:0BB8 00000000:0000 01 00000000:00000000 00:00000000 00000000     0        0 103 1 0000 10 0 0 10 -1', // state 01 ESTABLISHED (skip)
  ].join('\n');

  assert.deepEqual(parseProcNetTcpPorts(procSample), [8080]);

  const demux = createDockerLogDemuxer();
  const payload = Buffer.from('Status: ✓ café ready\n', 'utf8');
  const frame = Buffer.alloc(8 + payload.length);
  frame[0] = 1;
  frame.writeUInt32BE(payload.length, 4);
  payload.copy(frame, 8);

  // Split in middle of header + inside multi-byte UTF-8 character
  const part1 = frame.subarray(0, 5);
  const part2 = frame.subarray(5, 18);
  const part3 = frame.subarray(18);
  const out = demux(part1) + demux(part2) + demux(part3);
  assert.equal(out, 'Status: ✓ café ready\n');
});

test('sendPasswordResetEmail and email.ts contain zero unicode emojis', async () => {
  await sendPasswordResetEmail('student@example.com', 'student1', 'reset_token_abc123');
  const emailSource = await fs.readFile(path.resolve(process.cwd(), 'src/lib/email.ts'), 'utf8');
  assert.equal(EMOJI_REGEX.test(emailSource), false, 'email.ts must remain strictly emoji-free');
});
