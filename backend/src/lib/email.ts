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

// ─── Branded HTML Wrapper ───────────────────────────────────────────
function wrapEmail(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:28px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:0.5px;">Code<span style="color:#3b82f6;">Host</span></span>
          </td>
        </tr>
        <!-- Title bar -->
        <tr>
          <td style="background:#1e293b;padding:12px 32px;">
            <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${title}</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">${body}</td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
              © ${new Date().getFullYear()} CodeHost · <a href="https://code-host.online" style="color:#2563eb;text-decoration:none;font-weight:600;">code-host.online</a><br>
              <a href="https://discord.gg/gsh2qpEXT4" style="color:#64748b;text-decoration:none;">Discord Support</a> · <a href="https://code-host.online/docs" style="color:#64748b;text-decoration:none;">Documentation</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;margin:20px 0;">${label}</a>`;
}

async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    logger.warn(`SMTP not configured. Email to ${to}: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"CodeHost" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error({ err }, `Failed to send email to ${to}: ${subject}`);
  }
}

// ─── Verification Email ─────────────────────────────────────────────
export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
  const body = `
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">Verify your email</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 8px;">Click the button below to verify your email address and unlock all CodeHost features.</p>
    ${ctaButton('Verify Email', verifyUrl)}
    <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">This link expires in 24 hours. If you didn't create a CodeHost account, ignore this email.</p>
  `;
  await sendMail(to, 'Verify your email - CodeHost', wrapEmail('Email Verification', body));
}

// ─── Welcome Email ──────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, username: string) {
  const body = `
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">Welcome to CodeHost, ${username}! 🚀</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">Your account is ready. Here is how to launch your first project:</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;">
      <strong style="color:#0f172a;font-size:13px;">1. Connect or Upload:</strong>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Deploy from GitHub or upload a .zip in seconds.</p>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;">
      <strong style="color:#0f172a;font-size:13px;">2. Pick a Starter Template:</strong>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Next.js, FastAPI, Express, Django, Go Fiber with 1 click.</p>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px;">
      <strong style="color:#0f172a;font-size:13px;">3. Instant SSL Subdomain:</strong>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Free HTTPS routing at your-project.code-host.online.</p>
    </div>
    ${ctaButton('Open Dashboard', 'https://code-host.online/dashboard')}
  `;
  await sendMail(to, 'Welcome to CodeHost! 🚀', wrapEmail('Welcome', body));
}

// ─── Payment Confirmation Email ─────────────────────────────────────
export async function sendPaymentConfirmationEmail(
  to: string,
  data: { credits: number; amountInr: number; newBalance: number; transactionId: string }
) {
  const body = `
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">Payment Confirmed ✅</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 20px;">Your purchase was successful. Here is your transaction receipt:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Credits Added</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;">
          <span style="color:#0f172a;font-weight:800;font-size:16px;">+${data.credits} credits</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Amount Paid</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;">
          <span style="color:#0f172a;font-weight:800;">₹${data.amountInr}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Wallet Balance</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;">
          <span style="color:#22c55e;font-weight:800;">${data.newBalance} credits</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Transaction ID</span>
        </td>
        <td style="padding:12px 16px;text-align:right;">
          <span style="color:#64748b;font-size:11px;font-family:monospace;">${data.transactionId}</span>
        </td>
      </tr>
    </table>
    ${ctaButton('View Invoice', `https://code-host.online/dashboard/billing/invoice/${data.transactionId}`)}
  `;
  await sendMail(to, `Payment Confirmed — +${data.credits} Credits Added`, wrapEmail('Payment Receipt', body));
}

// ─── Low Credit Warning Email ───────────────────────────────────────
export async function sendLowCreditWarningEmail(
  to: string,
  data: { balance: number; projectName?: string }
) {
  const body = `
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">⚠️ Low Credit Warning</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">
      Your wallet balance is low: <strong style="color:#ef4444;">${data.balance} credits remaining</strong>.
      ${data.projectName ? `Your project <strong>${data.projectName}</strong> may automatically pause soon.` : 'Your active containers will safely pause if credits reach zero.'}
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;color:#991b1b;font-size:12px;font-weight:600;">Top up any custom amount starting at just ₹16 (10 credits) to keep your servers live uninterrupted.</p>
    </div>
    ${ctaButton('Top Up Credits', 'https://code-host.online/dashboard/billing')}
  `;
  await sendMail(to, '⚠️ Low Credit Warning — CodeHost', wrapEmail('Credit Alert', body));
}

// ─── Server Status Notification Email ───────────────────────────────
export async function sendServerStatusEmail(
  to: string,
  data: { projectName: string; status: string; projectId: string }
) {
  const statusConfig: Record<string, { emoji: string; color: string; message: string }> = {
    running: { emoji: '🟢', color: '#22c55e', message: 'Your server is live and accepting incoming web traffic.' },
    stopped: { emoji: '🔴', color: '#ef4444', message: 'Your server has been safely stopped. You can restart it anytime.' },
    failed: { emoji: '❌', color: '#ef4444', message: 'Your build or startup process encountered an issue. Check the logs.' },
    building: { emoji: '🔨', color: '#f59e0b', message: 'A new deployment has begun building inside an isolated sandbox.' },
  };

  const config = statusConfig[data.status] || { emoji: '📋', color: '#64748b', message: `Status changed to ${data.status}.` };

  const body = `
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">${config.emoji} Server Status Update</h2>
    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Project</p>
      <p style="margin:0 0 12px;color:#0f172a;font-weight:800;font-size:16px;">${data.projectName}</p>
      <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Status</p>
      <span style="display:inline-block;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;color:#fff;background:${config.color};">${data.status.toUpperCase()}</span>
    </div>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;">${config.message}</p>
    ${ctaButton('View Project & Logs', `https://code-host.online/dashboard/projects/${data.projectId}`)}
  `;
  await sendMail(to, `${config.emoji} ${data.projectName} is now ${data.status.toUpperCase()}`, wrapEmail('Server Status', body));
}

// ─── Hackathon Pass Activated Email ─────────────────────────────────
export async function sendHackathonPassActivatedEmail(
  to: string,
  data: { expiresAt: Date; username: string }
) {
  const expiryStr = data.expiresAt.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const body = `
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">🔥 Weekend Hackathon Pass Activated!</h2>
    <p style="color:#475569;line-height:1.6;margin:0 0 20px;">
      Hey ${data.username}, your 72-hour Pro access is live! Build and demo your hackathon project with maximum power:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${['2 vCPUs Dedicated Compute', '512MB High-Speed RAM', '5GB NVMe Storage', 'Priority Build Sandboxes', 'Automatic SSL Routing'].map(f => `
      <tr><td style="padding:6px 0;">
        <span style="color:#22c55e;font-weight:800;margin-right:8px;">✓</span>
        <span style="color:#0f172a;font-size:13px;font-weight:600;">${f}</span>
      </td></tr>`).join('')}
    </table>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;color:#1e40af;font-size:12px;font-weight:600;">⏰ Pass Valid Until: ${expiryStr} IST (72 Hours)</p>
    </div>
    ${ctaButton('Open Dashboard', 'https://code-host.online/dashboard')}
  `;
  await sendMail(to, '🔥 Hackathon Pass Activated — 72 Hours of Pro Access', wrapEmail('Hackathon Pass', body));
}
