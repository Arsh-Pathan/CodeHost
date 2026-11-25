import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { demuxDockerLogBuffer } from '@codehost/docker';
import { resolveSafeProjectPath } from '../src/lib/validation.js';
import { BuilderService } from '../src/services/builder.js';
import { resolveVerifiedOrderGrant } from '../src/routes/billing.js';
import { canonicalizeEmail, isConfiguredAdminEmail } from '../src/services/referral.js';

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codehost-audit2-'));
  try {
    await fn(dir);
  } finally {
    await fs.remove(dir).catch(() => {});
  }
}

test('resolveSafeProjectPath allows nested safe paths and rejects traversal/symlinks', async () => {
  await withTempDir(async (dir) => {
    const safeFile = await resolveSafeProjectPath(dir, 'src/routes/index.ts');
    assert.equal(safeFile, path.resolve(dir, 'src/routes/index.ts'));

    await assert.rejects(
      () => resolveSafeProjectPath(dir, '../outside.txt'),
      /traversal outside project directory/
    );
    await assert.rejects(
      () => resolveSafeProjectPath(dir, 'C:\\Windows\\win.ini'),
      /traversal outside project directory/
    );
    await assert.rejects(
      () => resolveSafeProjectPath(dir, 'bad\0file.txt'),
      /Invalid file path/
    );

    // Symlink + dangling symlink containment check (skips gracefully if Windows lacks SeCreateSymbolicLinkPrivilege)
    const linkPath = path.join(dir, 'dangling-link.txt');
    let symlinkCreated = false;
    try {
      await fs.symlink(path.join(os.tmpdir(), 'nonexistent-outside-secret.txt'), linkPath);
      symlinkCreated = true;
    } catch (err: any) {
      if (err?.code !== 'EPERM' && err?.code !== 'EACCES') throw err;
    }

    if (symlinkCreated) {
      await assert.rejects(
        () => resolveSafeProjectPath(dir, 'dangling-link.txt'),
        /symlink/i
      );
    }
  });
});

test('demuxDockerLogBuffer cleanly decodes multiplexed Docker log frames and plain TTY logs', () => {
  const makeFrame = (streamType: number, text: string) => {
    const payload = Buffer.from(text, 'utf8');
    const header = Buffer.alloc(8);
    header[0] = streamType;
    header.writeUInt32BE(payload.length, 4);
    return Buffer.concat([header, payload]);
  };

  const multiFrame = Buffer.concat([
    makeFrame(1, 'Server listening on port 3000\n'),
    makeFrame(2, 'Warning: dev flag unused\n'),
    makeFrame(1, ''),
  ]);
  assert.equal(
    demuxDockerLogBuffer(multiFrame),
    'Server listening on port 3000\nWarning: dev flag unused\n'
  );

  // Plain unframed TTY chunk should pass through verbatim
  const plainChunk = Buffer.from('Plain TTY line without framing\n', 'utf8');
  assert.equal(demuxDockerLogBuffer(plainChunk), 'Plain TTY line without framing\n');
  assert.equal(demuxDockerLogBuffer(Buffer.alloc(0)), '');
});

test('BuilderService places buildCommand after COPY, escapes ENV $, and sanitizes Angular package name', async () => {
  await withTempDir(async (dir) => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      name: 'evil"; RUN id; echo "',
      dependencies: { '@angular/core': '^18.0.0' },
      scripts: { build: 'ng build' },
    });

    const df = await BuilderService.detectAndGenerateDockerfile(dir, {
      buildCommand: 'npm run build:custom',
      envVars: { SECRET_VAR: 'a$HOME"value' },
    });

    // Dependencies install before COPY . ., custom buildCommand runs AFTER COPY . .
    const copyAllIdx = df.indexOf('COPY . .');
    const installIdx = df.indexOf('RUN npm install');
    const customBuildIdx = df.indexOf('RUN npm run build:custom');
    assert.ok(installIdx !== -1 && installIdx < copyAllIdx, 'install must run before COPY . .');
    assert.ok(customBuildIdx > copyAllIdx, 'custom buildCommand must run after COPY . .');

    // '$' must be escaped in Dockerfile ENV instructions
    assert.ok(df.includes('ENV SECRET_VAR="a\\$HOME\\"value"'));

    // Angular packageJson.name injection characters stripped
    assert.equal(df.includes('RUN id'), false);
  });
});

test('resolveVerifiedOrderGrant rejects ₹1 orders and caps forged notes.credits strictly by paid amount', () => {
  // Attempt to claim credits with a ₹1 (100 paise) order
  const oneRupeeOrder = resolveVerifiedOrderGrant(
    { amount: 100, notes: { userId: 'u1', credits: '50' } },
    'u1'
  );
  assert.equal(oneRupeeOrder.ok, false);
  assert.equal(oneRupeeOrder.status, 400);

  // Attempt to inflate credits on a ₹16 (1600 paise) order via forged notes.credits
  const forgedNotes = resolveVerifiedOrderGrant(
    { amount: 1600, notes: { userId: 'u1', credits: '5000' } },
    'u1'
  );
  assert.equal(forgedNotes.ok, true);
  assert.equal(forgedNotes.creditsToAdd, 10);

  // Discounted 600-credit Pro Scale pack (₹720 = 72000 paise) grants all 600 credits
  const packGrant = resolveVerifiedOrderGrant(
    { amount: 72000, notes: { userId: 'u1', credits: '600' } },
    'u1'
  );
  assert.equal(packGrant.ok, true);
  assert.equal(packGrant.creditsToAdd, 600);
});

test('canonicalizeEmail and isConfiguredAdminEmail prevent referral alias & case bypasses', () => {
  assert.equal(
    canonicalizeEmail('  A.R.S.H+spam@googlemail.com '),
    canonicalizeEmail('arsh@gmail.com')
  );
  assert.equal(canonicalizeEmail('user.name+ref@example.com'), 'user.name@example.com');
  assert.equal(isConfiguredAdminEmail('Mail.Arsh.Pathan@GMAIL.com'), true);
  assert.equal(isConfiguredAdminEmail('attacker@gmail.com'), false);
});
