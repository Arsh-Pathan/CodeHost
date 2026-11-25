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

const appBaseUrl = (env.APP_URL && !env.APP_URL.includes('localhost')
  ? env.APP_URL
  : 'https://code-host.online').replace(/\/$/, '');
const domainHost = env.DOMAIN || 'code-host.online';
const logoUrl = `${appBaseUrl}/logo.png`;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHeaderCrlf(value: string): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function safeHref(url: string): string {
  const trimmed = String(url ?? '').trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return escapeHtml(appBaseUrl);
}

// ─── Branded HTML Wrapper (CodeHost Production Theme) ───────────────
export function wrapEmail(title: string, body: string, options?: { badge?: string; previewText?: string }): string {
  const safeTitle = escapeHtml(title);
  const badgeText = escapeHtml(options?.badge || title);
  const previewText = escapeHtml(options?.previewText || title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle} - CodeHost</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:#334155;">
  <!-- Preheader text for inbox previews -->
  <div style="display:none;font-size:1px;color:#FFFFFF;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:580px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 16px rgba(15,23,42,0.04);">
          
          <!-- Top Brand Header with Logo -->
          <tr>
            <td style="padding:24px 32px 20px;border-bottom:1px solid #F1F5F9;background-color:#FFFFFF;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <a href="https://code-host.online" target="_blank" style="text-decoration:none;display:block;">
                            <img src="${logoUrl}" width="34" height="34" alt="CodeHost" style="display:block;border:0;outline:none;border-radius:8px;" />
                          </a>
                        </td>
                        <td style="vertical-align:middle;">
                          <a href="https://code-host.online" target="_blank" style="text-decoration:none;font-size:20px;font-weight:800;letter-spacing:-0.4px;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                            Code<span style="color:#2563EB;">Host</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#475569;background-color:#F1F5F9;padding:4px 10px;border-radius:6px;border:1px solid #E2E8F0;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:32px;color:#334155;font-size:14px;line-height:1.65;">
              ${body}
            </td>
          </tr>

          <!-- Help / Support Callout -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;">
                <tr>
                  <td style="font-size:12px;color:#64748B;line-height:1.5;">
                    Need assistance or have technical questions? Join our
                    <a href="https://discord.gg/gsh2qpEXT4" style="color:#2563EB;font-weight:700;text-decoration:none;">Developer Community</a> 
                    or consult our 
                    <a href="https://code-host.online/docs" style="color:#2563EB;font-weight:700;text-decoration:none;">Documentation</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0F172A;">
                CodeHost Cloud Platform
              </p>
              <p style="margin:0 0 12px;font-size:11px;color:#64748B;line-height:1.5;">
                Automated container virtualization and edge hosting for developers and students.<br>
                Core platform engineered by CSky Developments.
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                <a href="https://code-host.online" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Home</a> &middot;
                <a href="https://code-host.online/dashboard" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Dashboard</a> &middot;
                <a href="https://code-host.online/docs" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Docs</a> &middot;
                <a href="https://code-host.online/terms" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Terms</a> &middot;
                <a href="https://code-host.online/privacy" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Privacy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(label: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0 16px;">
      <tr>
        <td align="center" style="border-radius:10px;background-color:#2563EB;">
          <a href="${safeHref(href)}" target="_blank" style="background-color:#2563EB;border:1px solid #2563EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:1;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:10px;display:inline-block;letter-spacing:0.2px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

async function sendMail(to: string, subject: string, html: string) {
  const cleanTo = stripHeaderCrlf(to);
  const cleanSubject = stripHeaderCrlf(subject);
  if (!transporter) {
    logger.warn(`SMTP not configured. Email to ${cleanTo}: ${cleanSubject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || `"CodeHost" <${env.SMTP_USER}>`,
      to: cleanTo,
      subject: cleanSubject,
      html,
    });
    logger.info(`Email sent to ${cleanTo}: ${cleanSubject}`);
  } catch (err) {
    logger.error({ err }, `Failed to send email to ${cleanTo}: ${cleanSubject}`);
  }
}

// ─── 1. Email Verification Email ─────────────────────────────────────
export async function sendVerificationEmail(to: string, token: string, username?: string) {
  const verifyBase = (env.APP_URL || appBaseUrl).replace(/\/$/, '');
  const verifyUrl = `${verifyBase}/verify-email?token=${encodeURIComponent(token)}`;
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Verify your email address
    </h1>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Hello ${username ? `<strong>${escapeHtml(username)}</strong>` : 'there'}, thank you for signing up for CodeHost. Please verify your email address to activate your cloud account and start deploying projects.
    </p>

    <div style="background-color:#F0FDF4;border:1px solid #DCFCE7;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#166534;font-size:13px;font-weight:600;">
        Account Benefits: Verified accounts receive complimentary cloud compute quota, automated TLS certificates, and persistent subdomains.
      </p>
    </div>

    ${ctaButton('Verify Email Address', verifyUrl)}

    <p style="margin:20px 0 6px;color:#64748B;font-size:12px;line-height:1.5;">
      If the button above does not work, copy and paste this verification URL into your browser:
    </p>
    <p style="margin:0;font-size:11px;font-family:monospace;background-color:#F1F5F9;padding:10px 14px;border-radius:8px;word-break:break-all;color:#0F172A;border:1px solid #E2E8F0;">
      ${verifyUrl}
    </p>
    <p style="color:#94A3B8;font-size:11px;margin:20px 0 0;line-height:1.5;">
      This security link expires in 24 hours. If you did not create an account on CodeHost, you can safely disregard this message.
    </p>
  `;

  await sendMail(
    to,
    'Verify your email address - CodeHost',
    wrapEmail('Email Verification', body, {
      badge: 'Account Security',
      previewText: 'Verify your email address to activate your CodeHost cloud account.',
    })
  );
}

// ─── 2. Welcome Email ────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, username: string, bonusCredits = 0) {
  const safeUsername = escapeHtml(username);
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Welcome to CodeHost, ${safeUsername}
    </h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">
      Your cloud development environment is active and ready. You can now launch full-stack applications, background workers, and APIs in seconds with automated containerization.
    </p>

    ${bonusCredits > 0 ? `
    <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;margin-bottom:22px;">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1D4ED8;letter-spacing:0.8px;">Welcome Promotion</span>
      <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#1E3A8A;">
        +${bonusCredits} Free Deployment Credits Credited to Your Wallet
      </p>
    </div>` : ''}

    <h2 style="color:#0F172A;margin:22px 0 12px;font-size:15px;font-weight:800;letter-spacing:-0.2px;">
      Getting Started in 3 Steps
    </h2>

    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;margin-bottom:10px;">
      <strong style="color:#0F172A;font-size:13px;">1. Connect Repository or Upload Code</strong>
      <p style="margin:4px 0 0;color:#64748B;font-size:12px;line-height:1.5;">Connect any public or private GitHub repository, or drag-and-drop a project ZIP archive directly from your browser.</p>
    </div>

    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;margin-bottom:10px;">
      <strong style="color:#0F172A;font-size:13px;">2. Automated Framework Detection</strong>
      <p style="margin:4px 0 0;color:#64748B;font-size:12px;line-height:1.5;">Automatic builds for Next.js, Node.js, Python FastAPI/Django, Go, Rust, and custom Dockerfiles.</p>
    </div>

    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;margin-bottom:18px;">
      <strong style="color:#0F172A;font-size:13px;">3. Instant HTTPS Subdomain & Verification</strong>
      <p style="margin:4px 0 0;color:#64748B;font-size:12px;line-height:1.5;">Every deployment receives an encrypted HTTPS URL along with an official deployment certificate to showcase your skills.</p>
    </div>

    ${ctaButton('Open Developer Dashboard', 'https://code-host.online/dashboard')}
  `;

  await sendMail(
    to,
    'Welcome to CodeHost - Getting Started',
    wrapEmail('Welcome', body, {
      badge: 'Account Ready',
      previewText: `Welcome to CodeHost, ${username}. Your cloud development environment is active.`,
    })
  );
}

// ─── 3. Student Certificate Award Email ─────────────────────────────
export async function sendCertificateAwardEmail(
  to: string,
  data: {
    recipientName: string;
    projectName: string;
    liveUrl: string;
    certNumber: string;
    certUrl: string;
  }
) {
  const safeRecipient = escapeHtml(data.recipientName);
  const safeProject = escapeHtml(data.projectName);
  const safeCertNum = escapeHtml(data.certNumber);
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;padding:6px 14px;border-radius:20px;background-color:#EFF6FF;border:1px solid #DBEAFE;margin-bottom:12px;">
        <span style="font-size:11px;font-weight:800;color:#2563EB;text-transform:uppercase;letter-spacing:1px;">Official Accreditation</span>
      </div>
      <h1 style="color:#0F172A;margin:4px 0 6px;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
        Certificate Awarded to ${safeRecipient}
      </h1>
      <p style="margin:0;color:#2563EB;font-weight:700;font-size:14px;">
        Certified Cloud Deployer
      </p>
    </div>

    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
      You have successfully deployed <strong>${safeProject}</strong> to production on CodeHost cloud infrastructure. Your official cryptographic certificate has been generated and validated.
    </p>

    <!-- Certificate Summary Card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:22px;overflow:hidden;">
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Certificate Number
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-family:monospace;font-weight:800;color:#0F172A;font-size:13px;">
          ${safeCertNum}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Live Application
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;">
          <a href="${safeHref(data.liveUrl)}" target="_blank" style="color:#2563EB;font-weight:700;font-size:12px;text-decoration:none;">
            ${safeProject}.${escapeHtml(domainHost)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Verification Status
        </td>
        <td style="padding:12px 18px;text-align:right;">
          <span style="background-color:#DCFCE7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;display:inline-block;">
            Verified Authentic
          </span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 16px;">
      You can share this credential on LinkedIn, Twitter, or attach it to your resume. The certificate features a permanent public verification link and QR code for recruiters and educators.
    </p>

    ${ctaButton('View Official Certificate', data.certUrl)}
  `;

  await sendMail(
    to,
    `Certificate of Achievement: Cloud Deployment for ${data.projectName}`,
    wrapEmail('Official Certificate', body, {
      badge: 'Certificate',
      previewText: `Official accreditation: Cloud Deployment Certificate awarded for ${data.projectName}.`,
    })
  );
}

// ─── 4. Referral Reward Credited Email ───────────────────────────────
export async function sendReferralEarnedEmail(
  to: string,
  data: {
    referrerUsername: string;
    refereeUsername: string;
    creditsEarned: number;
    totalBalance: number;
    referralUrl: string;
  }
) {
  const safeReferee = escapeHtml(data.refereeUsername);
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Referral Reward Credited: +${data.creditsEarned} Credits
    </h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">
      Developer <strong>@${safeReferee}</strong> has verified their email on CodeHost using your referral invitation link.
    </p>

    <!-- Credits Card -->
    <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:22px;margin-bottom:20px;text-align:center;">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#2563EB;letter-spacing:0.8px;">Reward Processed</span>
      <div style="font-size:32px;font-weight:900;color:#1E3A8A;margin:6px 0;">
        +${data.creditsEarned} Credits
      </div>
      <p style="margin:0;color:#475569;font-size:13px;">
        Your updated account balance is <strong>${data.totalBalance} credits</strong>.
      </p>
    </div>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 16px;">
      Share your referral link with colleagues and students to earn 50 compute credits for every signup. New signups also receive 25 bonus credits.
    </p>

    ${ctaButton('View Referrals Dashboard', 'https://code-host.online/dashboard/referrals')}
  `;

  await sendMail(
    to,
    `Referral Reward Credited: +${data.creditsEarned} Credits`,
    wrapEmail('Referral Reward', body, {
      badge: 'Rewards',
      previewText: `You earned +${data.creditsEarned} compute credits from a successful referral.`,
    })
  );
}

// ─── 5. Payment Confirmation Email ──────────────────────────────────
export async function sendPaymentConfirmationEmail(
  to: string,
  data: { credits: number; amountInr: number; newBalance: number; transactionId: string }
) {
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Payment Confirmation & Receipt
    </h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 20px;font-size:14px;">
      Thank you for your purchase. Your payment has been processed successfully, and compute credits have been deposited to your account.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;margin-bottom:22px;">
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Credits Purchased
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;font-size:14px;color:#0F172A;">
          +${data.credits} credits
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Amount Paid
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;color:#0F172A;">
          INR ${data.amountInr}.00
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Updated Balance
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;color:#16A34A;">
          ${data.newBalance} credits
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Transaction Reference
        </td>
        <td style="padding:12px 18px;text-align:right;font-family:monospace;font-size:11px;color:#64748B;">
          ${escapeHtml(data.transactionId)}
        </td>
      </tr>
    </table>

    ${ctaButton('View Billing Statement', `${appBaseUrl}/dashboard/billing/invoice/${encodeURIComponent(data.transactionId)}`)}
  `;

  await sendMail(
    to,
    `Payment Receipt: +${data.credits} Credits Added`,
    wrapEmail('Payment Receipt', body, {
      badge: 'Receipt',
      previewText: `Payment confirmed: +${data.credits} credits deposited to your CodeHost account.`,
    })
  );
}

// ─── 6. Low Credit Warning Email ────────────────────────────────────
export async function sendLowCreditWarningEmail(
  to: string,
  data: { balance: number; projectName?: string }
) {
  const safeProject = data.projectName ? escapeHtml(data.projectName) : '';
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Low Credit Balance Alert
    </h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;font-size:14px;">
      Your CodeHost compute credit balance is running low: <strong style="color:#DC2626;">${data.balance} credits remaining</strong>.
      ${safeProject ? `Your project <strong>${safeProject}</strong> may automatically hibernate soon.` : 'Active containers will safely hibernate if your credit balance reaches zero.'}
    </p>

    <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#991B1B;font-size:13px;font-weight:600;line-height:1.5;">
        Action Recommended: Top up your credits to ensure uninterrupted uptime for your live applications and services.
      </p>
    </div>

    ${ctaButton('Top Up Account Balance', 'https://code-host.online/dashboard/billing')}
  `;

  await sendMail(
    to,
    'Action Required: Low Credit Balance Alert',
    wrapEmail('Credit Alert', body, {
      badge: 'Balance Notice',
      previewText: `Low credit balance alert: ${data.balance} credits remaining on your CodeHost account.`,
    })
  );
}

// ─── 7. Server Status Notification Email ────────────────────────────
export async function sendServerStatusEmail(
  to: string,
  data: { projectName: string; status: string; projectId: string }
) {
  const statusConfig: Record<string, { color: string; bg: string; border: string; message: string }> = {
    running: {
      color: '#16A34A',
      bg: '#F0FDF4',
      border: '#DCFCE7',
      message: 'Your container is active, healthy, and serving incoming web traffic.',
    },
    stopped: {
      color: '#64748B',
      bg: '#F8FAFC',
      border: '#E2E8F0',
      message: 'Your container is currently stopped. You can restart it anytime from your dashboard.',
    },
    failed: {
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      message: 'The build or startup process encountered an error. Please inspect the container logs.',
    },
    building: {
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#DBEAFE',
      message: 'A deployment build is actively in progress within an isolated container sandbox.',
    },
  };

  const safeProject = escapeHtml(data.projectName);
  const safeStatus = escapeHtml(data.status);

  const config = statusConfig[data.status] || {
    color: '#64748B',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    message: `Status updated to ${safeStatus}.`,
  };

  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Server Status Notification
    </h1>
    <div style="background-color:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;padding:18px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">Project</p>
      <p style="margin:0 0 14px;color:#0F172A;font-weight:800;font-size:16px;">${safeProject}</p>
      <p style="margin:0 0 6px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">Current State</p>
      <span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:800;color:${config.color};background-color:${config.bg};border:1px solid ${config.border};letter-spacing:0.5px;">
        ${safeStatus.toUpperCase()}
      </span>
    </div>
    <p style="color:#475569;line-height:1.6;margin:0 0 18px;font-size:14px;">${config.message}</p>
    ${ctaButton('Open Project Console', `${appBaseUrl}/dashboard/project/${encodeURIComponent(data.projectId)}`)}
  `;

  await sendMail(
    to,
    `Server Status: ${data.projectName} is now ${data.status.toUpperCase()}`,
    wrapEmail('Server Status', body, {
      badge: 'Deployment Event',
      previewText: `Server status update: ${data.projectName} is now ${data.status.toUpperCase()}.`,
    })
  );
}

// ─── 8. Hackathon Pass Activated Email ──────────────────────────────
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
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Weekend Hackathon Pass Activated
    </h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 20px;font-size:14px;">
      Hello ${escapeHtml(data.username)}, your 72-hour Pro access is now active. Your projects are enabled with dedicated high-performance compute:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 18px;margin-bottom:20px;">
      ${[
        '2 Dedicated vCPUs Compute',
        '512MB High-Speed RAM',
        '5GB NVMe Persistent Storage',
        'Priority Multi-Stage Build Queues',
        'Automated TLS and Subdomain Routing',
      ].map(f => `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#0F172A;font-weight:600;">
          <span style="color:#2563EB;margin-right:8px;font-weight:bold;">&bull;</span> ${f}
        </td>
      </tr>`).join('')}
    </table>
    <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#1E40AF;font-size:13px;font-weight:700;">
        Access Valid Until: ${expiryStr} IST (72-Hour Duration)
      </p>
    </div>
    ${ctaButton('Open Dashboard', 'https://code-host.online/dashboard')}
  `;

  await sendMail(
    to,
    'Hackathon Pass Activated: 72 Hours of Pro Access',
    wrapEmail('Hackathon Pass', body, {
      badge: 'Pro Tier Access',
      previewText: `Hackathon Pass active: 72 hours of dedicated Pro compute unlocked for ${data.username}.`,
    })
  );
}
