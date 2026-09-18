import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!razorpayInstance) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured in environment');
    }
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string | number>;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const client = getRazorpayClient();
  const options = {
    amount: Math.round(params.amount),
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes,
  };

  const order = await client.orders.create(options);
  return order;
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!env.RAZORPAY_KEY_SECRET) {
    logger.error('RAZORPAY_KEY_SECRET is not set');
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  return generatedSignature === params.signature;
}

export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string
): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    logger.error('RAZORPAY_WEBHOOK_SECRET is not set');
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return generatedSignature === signature;
}
