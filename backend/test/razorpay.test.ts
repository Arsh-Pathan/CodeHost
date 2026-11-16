import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { env } from '@codehost/config';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from '../src/services/razorpay.js';

test('verifyRazorpayPaymentSignature validates genuine HMAC-SHA256 signatures and rejects tampered ones', () => {
  const prevSecret = env.RAZORPAY_KEY_SECRET;
  (env as any).RAZORPAY_KEY_SECRET = 'test_rzp_secret_123';

  try {
    const orderId = 'order_Test123';
    const paymentId = 'pay_Test456';
    const signature = crypto
      .createHmac('sha256', 'test_rzp_secret_123')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifyRazorpayPaymentSignature({ orderId, paymentId, signature }), true);
    assert.equal(verifyRazorpayPaymentSignature({ orderId, paymentId, signature: '0'.repeat(64) }), false);
  } finally {
    (env as any).RAZORPAY_KEY_SECRET = prevSecret;
  }
});

test('verifyRazorpayWebhookSignature validates genuine webhook payloads and rejects tampered ones', () => {
  const prevWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  (env as any).RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_456';

  try {
    const rawBody = JSON.stringify({ event: 'payment.captured', payload: { id: 'pay_1' } });
    const validSig = crypto
      .createHmac('sha256', 'test_webhook_secret_456')
      .update(rawBody)
      .digest('hex');

    assert.equal(verifyRazorpayWebhookSignature(rawBody, validSig), true);
    assert.equal(verifyRazorpayWebhookSignature(rawBody + ' ', validSig), false);
  } finally {
    (env as any).RAZORPAY_WEBHOOK_SECRET = prevWebhookSecret;
  }
});
