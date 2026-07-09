import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string> = {}) {
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes,
  });
  logger.info(`Razorpay order created: ${order.id} for ${amountPaise} paise`);
  return order;
}

export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}
