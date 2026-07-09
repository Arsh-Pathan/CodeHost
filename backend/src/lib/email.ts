import nodemailer from 'nodemailer';
import { env } from '@codehost/config';
import { logger } from '@codehost/logger';

const canSendEmail = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = canSendEmail
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: (env.SMTP_PORT || 587) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;

  if (!transporter) {
    logger.warn(`SMTP not configured. Verification link for ${to}: ${verifyUrl}`);
    return;
  }

  await transporter.sendMail({
    from: `"CodeHost" <${env.SMTP_USER}>`,
    to,
    subject: 'Verify your email - CodeHost',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">Verify your email</h2>
        <p style="color: #475569; line-height: 1.6;">Click the button below to verify your email address and unlock all CodeHost features.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">Verify Email</a>
        <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours. If you didn't create a CodeHost account, ignore this email.</p>
      </div>
    `,
  });
}
