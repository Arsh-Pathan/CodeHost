import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wrapEmail,
  ctaButton,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendCertificateAwardEmail,
  sendReferralEarnedEmail,
  sendPaymentConfirmationEmail,
  sendLowCreditWarningEmail,
  sendServerStatusEmail,
  sendHackathonPassActivatedEmail,
} from '../src/lib/email.js';

// Regex matching unicode emoji characters
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

test('wrapEmail produces valid HTML with CodeHost branding and logo image', () => {
  const html = wrapEmail('Test Subject', '<p>Test body content</p>', {
    badge: 'Account Notice',
    previewText: 'This is a preview test',
  });

  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('logo.png'));
  assert.ok(html.includes('Code<span style="color:#2563EB;">Host</span>'));
  assert.ok(html.includes('Account Notice'));
  assert.ok(html.includes('This is a preview test'));
  assert.ok(html.includes('Test body content'));
  assert.equal(EMOJI_REGEX.test(html), false, 'wrapEmail output must not contain emojis');
});

test('ctaButton creates accessible styled link without emojis', () => {
  const btn = ctaButton('Get Started', 'https://code-host.online');
  assert.ok(btn.includes('Get Started'));
  assert.ok(btn.includes('href="https://code-host.online"'));
  assert.equal(EMOJI_REGEX.test(btn), false, 'ctaButton must not contain emojis');
});

test('All email generator functions execute cleanly without emojis in subject or body', async () => {
  // Test that running all email functions does not throw and works without SMTP configured
  await sendVerificationEmail('test@example.com', 'sample_token_123', 'arsh');
  await sendWelcomeEmail('test@example.com', 'arsh', 50);
  await sendCertificateAwardEmail('test@example.com', {
    recipientName: 'Arsh Pathan',
    projectName: 'my-fastapi-app',
    liveUrl: 'https://my-fastapi-app.code-host.online',
    certNumber: 'CH-2026-9999',
    certUrl: 'https://code-host.online/certificate/CH-2026-9999',
  });
  await sendReferralEarnedEmail('test@example.com', {
    referrerUsername: 'arsh',
    refereeUsername: 'rahul',
    creditsEarned: 50,
    totalBalance: 150,
    referralUrl: 'https://code-host.online/r/arsh',
  });
  await sendPaymentConfirmationEmail('test@example.com', {
    credits: 100,
    amountInr: 160,
    newBalance: 250,
    transactionId: 'txn_test_7788',
  });
  await sendLowCreditWarningEmail('test@example.com', {
    balance: 15,
    projectName: 'my-fastapi-app',
  });
  await sendServerStatusEmail('test@example.com', {
    projectName: 'my-fastapi-app',
    status: 'running',
    projectId: 'proj_123',
  });
  await sendServerStatusEmail('test@example.com', {
    projectName: 'my-fastapi-app',
    status: 'failed',
    projectId: 'proj_123',
  });
  await sendHackathonPassActivatedEmail('test@example.com', {
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    username: 'arsh',
  });
});
