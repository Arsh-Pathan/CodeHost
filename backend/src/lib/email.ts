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

// ─── Branded HTML Wrapper (CodeHost Light Theme) ─────────────────────
function wrapEmail(title: string, body: string): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          
          <!-- Top Brand Header -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #F1F5F9;text-align:left;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#0F172A;text-decoration:none;">
                      Code<span style="color:#2563EB;">Host</span>
                    </span>
                    <span style="display:inline-block;margin-left:8px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#2563EB;background:#EFF6FF;padding:3px 8px;border-radius:6px;border:1px solid #DBEAFE;">
                      Cloud
                    </span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:11px;font-weight:700;color:#64748B;letter-spacing:0.5px;text-transform:uppercase;">
                      ${title}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:36px;color:#334155;font-size:14px;line-height:1.65;">
              ${body}
            </td>
          </tr>

          <!-- Help / Support Callout -->
          <tr>
            <td style="padding:0 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;">
                <tr>
                  <td style="font-size:12px;color:#64748B;line-height:1.5;">
                    Need assistance or have feedback? Join our 
                    <a href="https://discord.gg/gsh2qpEXT4" style="color:#2563EB;font-weight:700;text-decoration:none;">Developer Discord</a> 
                    or consult the 
                    <a href="https://code-host.online/docs" style="color:#2563EB;font-weight:700;text-decoration:none;">Documentation</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:24px 36px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0F172A;">
                CodeHost Cloud Platform
              </p>
              <p style="margin:0 0 12px;font-size:11px;color:#94A3B8;line-height:1.5;">
                Zero DevOps, instant cloud containers for developers and students.<br>
                Core hosted and powered by <strong style="color:#64748B;">CSky Developments</strong>.
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                <a href="https://code-host.online" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Home</a> ·
                <a href="https://code-host.online/dashboard" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Dashboard</a> ·
                <a href="https://code-host.online/terms" style="color:#64748B;text-decoration:none;font-weight:600;margin:0 6px;">Terms</a> ·
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

function ctaButton(label: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 16px;">
      <tr>
        <td style="border-radius:12px;background:#2563EB;text-align:center;">
          <a href="${href}" target="_blank" style="background:#2563EB;border:1px solid #2563EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:700;line-height:1;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:12px;display:inline-block;letter-spacing:0.2px;">
            ${label} →
          </a>
        </td>
      </tr>
    </table>
  `;
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

// ─── 1. Email Verification Email ─────────────────────────────────────
export async function sendVerificationEmail(to: string, token: string, username?: string) {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Verify your CodeHost account
    </h1>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Hey ${username ? `<strong>${username}</strong>` : 'there'}, thanks for joining CodeHost! Please verify your email address to activate your cloud workspace and start deploying projects.
    </p>

    <div style="background:#F0FDF4;border:1px solid #DCFCE7;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#166534;font-size:13px;font-weight:600;">
        🎁 Once verified, you get free cloud compute credits and persistent subdomains.
      </p>
    </div>

    ${ctaButton('Verify Email Address', verifyUrl)}

    <p style="margin:18px 0 6px;color:#64748B;font-size:12px;line-height:1.5;">
      Or copy and paste this link in your browser:
    </p>
    <p style="margin:0;font-size:11px;font-family:monospace;background:#F1F5F9;padding:8px 12px;border-radius:8px;word-break:break-all;color:#0F172A;">
      ${verifyUrl}
    </p>
    <p style="color:#94A3B8;font-size:11px;margin:20px 0 0;">
      This security link expires in 24 hours. If you did not create an account on CodeHost, you can safely ignore this email.
    </p>
  `;
  await sendMail(to, 'Verify your email - CodeHost', wrapEmail('Email Verification', body));
}

// ─── 2. Welcome Email ────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, username: string, bonusCredits = 0) {
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Welcome to CodeHost, ${username}! 🚀
    </h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">
      Your cloud developer environment is ready. Deploy fullstack web apps, microservices, and databases in seconds with zero terminal configuration.
    </p>

    ${bonusCredits > 0 ? `
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;padding:16px 20px;margin-bottom:22px;">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1D4ED8;letter-spacing:1px;">Bonus Unlocked</span>
      <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#1E3A8A;">
        +${bonusCredits} Free Deployment Credits Deposited in your Wallet! 🎁
      </p>
    </div>` : ''}

    <h2 style="color:#0F172A;margin:20px 0 12px;font-size:15px;font-weight:800;">
      How to deploy your first project in 3 steps:
    </h2>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;margin-bottom:10px;">
      <strong style="color:#0F172A;font-size:13px;">1. Connect GitHub or Upload ZIP</strong>
      <p style="margin:4px 0 0;color:#64748B;font-size:12px;">Push code directly from Git or drop a project archive.</p>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;margin-bottom:10px;">
      <strong style="color:#0F172A;font-size:13px;">2. Pick from 20+ Optimized Frameworks</strong>
      <p style="margin:4px 0 0;color:#64748B;font-size:12px;">Next.js, FastAPI, Express, Django, Go Fiber, and more.</p>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
      <strong style="color:#0F172A;font-size:13px;">3. Instant Free SSL Subdomain & Certificate</strong>
      <p style="margin:4px 0 0;color:#64748B;font-size:12px;">Get a live HTTPS URL and earn your official deployment certificate to share on LinkedIn!</p>
    </div>

    ${ctaButton('Go to My Dashboard', 'https://code-host.online/dashboard')}
  `;
  await sendMail(to, 'Welcome to CodeHost! 🚀', wrapEmail('Welcome', body));
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
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">🎓</span>
      <h1 style="color:#0F172A;margin:8px 0 6px;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
        Congratulations, ${data.recipientName}!
      </h1>
      <p style="margin:0;color:#2563EB;font-weight:800;font-size:14px;">
        You are now a Certified Cloud Deployer
      </p>
    </div>

    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
      You successfully shipped <strong>${data.projectName}</strong> to production on CodeHost cloud infrastructure. Your official cryptographic certificate has been generated and verified.
    </p>

    <!-- Certificate Summary Card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;margin-bottom:22px;overflow:hidden;">
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Certificate Number
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-family:monospace;font-weight:800;color:#0F172A;font-size:13px;">
          ${data.certNumber}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Live Application
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;">
          <a href="${data.liveUrl}" target="_blank" style="color:#2563EB;font-weight:700;font-size:12px;text-decoration:none;">
            ${data.projectName}.code-host.online ↗
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Verification Status
        </td>
        <td style="padding:12px 18px;text-align:right;">
          <span style="background:#DCFCE7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;">
            ✓ Verified Authentic
          </span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 16px;">
      Share your achievement on <strong>LinkedIn</strong> and <strong>Twitter</strong>. Your certificate includes an interactive QR code allowing recruiters, professors, and peers to verify your live deployment!
    </p>

    ${ctaButton('View & Share My Certificate', data.certUrl)}
  `;
  await sendMail(
    to,
    `🎓 You earned your Cloud Deployment Certificate for ${data.projectName}!`,
    wrapEmail('Official Certificate', body)
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
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      You just earned +${data.creditsEarned} free credits! 🎁
    </h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">
      Great news! <strong>@${data.refereeUsername}</strong> just registered on CodeHost using your referral link.
    </p>

    <!-- Credits Card -->
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;padding:20px;margin-bottom:20px;text-align:center;">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#2563EB;letter-spacing:1px;">Reward Credited</span>
      <div style="font-size:32px;font-weight:900;color:#1E3A8A;margin:6px 0;">
        +${data.creditsEarned} Credits
      </div>
      <p style="margin:0;color:#475569;font-size:13px;">
        Your new wallet balance is <strong>${data.totalBalance} credits</strong>.
      </p>
    </div>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 16px;">
      Keep inviting friends to earn 100 credits for every signup. Your friends also receive 50 bonus credits on registration!
    </p>

    ${ctaButton('View Referrals Dashboard', 'https://code-host.online/dashboard/referrals')}
  `;
  await sendMail(
    to,
    `🎁 You earned +${data.creditsEarned} credits on CodeHost!`,
    wrapEmail('Referral Reward', body)
  );
}

// ─── 5. Payment Confirmation Email ──────────────────────────────────
export async function sendPaymentConfirmationEmail(
  to: string,
  data: { credits: number; amountInr: number; newBalance: number; transactionId: string }
) {
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      Payment Confirmed ✅
    </h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 20px;font-size:14px;">
      Your payment was processed successfully. Here is your official receipt:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8FAFC;border-radius:14px;border:1px solid #E2E8F0;overflow:hidden;margin-bottom:22px;">
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Credits Purchased
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;font-size:15px;color:#0F172A;">
          +${data.credits} credits
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Amount Paid
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;color:#0F172A;">
          ₹${data.amountInr} INR
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          New Balance
        </td>
        <td style="padding:12px 18px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;color:#16A34A;">
          ${data.newBalance} credits
        </td>
      </tr>
      <tr>
        <td style="padding:12px 18px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">
          Transaction ID
        </td>
        <td style="padding:12px 18px;text-align:right;font-family:monospace;font-size:11px;color:#64748B;">
          ${data.transactionId}
        </td>
      </tr>
    </table>

    ${ctaButton('View Invoice', `https://code-host.online/dashboard/billing/invoice/${data.transactionId}`)}
  `;
  await sendMail(to, `Payment Confirmed — +${data.credits} Credits Added`, wrapEmail('Payment Receipt', body));
}

// ─── 6. Low Credit Warning Email ────────────────────────────────────
export async function sendLowCreditWarningEmail(
  to: string,
  data: { balance: number; projectName?: string }
) {
  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      ⚠️ Low Credit Warning
    </h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px;font-size:14px;">
      Your CodeHost credit balance is low: <strong style="color:#DC2626;">${data.balance} credits remaining</strong>.
      ${data.projectName ? `Your project <strong>${data.projectName}</strong> may automatically pause soon.` : 'Your active containers will safely pause if credits reach zero.'}
    </p>

    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#991B1B;font-size:13px;font-weight:600;">
        Top up any custom amount starting at just ₹16 (10 credits) to keep your containers live uninterrupted.
      </p>
    </div>

    ${ctaButton('Top Up Credits', 'https://code-host.online/dashboard/billing')}
  `;
  await sendMail(to, '⚠️ Low Credit Warning — CodeHost', wrapEmail('Credit Alert', body));
}

// ─── 7. Server Status Notification Email ────────────────────────────
export async function sendServerStatusEmail(
  to: string,
  data: { projectName: string; status: string; projectId: string }
) {
  const statusConfig: Record<string, { emoji: string; color: string; message: string }> = {
    running: { emoji: '🟢', color: '#16A34A', message: 'Your server is live and accepting incoming web traffic.' },
    stopped: { emoji: '🔴', color: '#DC2626', message: 'Your server has been safely stopped. You can restart it anytime.' },
    failed: { emoji: '❌', color: '#DC2626', message: 'Your build or startup process encountered an issue. Check the logs.' },
    building: { emoji: '🔨', color: '#D97706', message: 'A new deployment has begun building inside an isolated sandbox.' },
  };

  const config = statusConfig[data.status] || { emoji: '📋', color: '#64748B', message: `Status changed to ${data.status}.` };

  const body = `
    <h1 style="color:#0F172A;margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
      ${config.emoji} Server Status Update
    </h1>
    <div style="background:#F8FAFC;border-radius:14px;border:1px solid #E2E8F0;padding:18px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">Project</p>
      <p style="margin:0 0 14px;color:#0F172A;font-weight:800;font-size:16px;">${data.projectName}</p>
      <p style="margin:0 0 6px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;">Status</p>
      <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:800;color:#FFFFFF;background:${config.color};">
        ${data.status.toUpperCase()}
      </span>
    </div>
    <p style="color:#475569;line-height:1.6;margin:0 0 18px;font-size:14px;">${config.message}</p>
    ${ctaButton('View Project & Logs', `https://code-host.online/dashboard/project/${data.projectId}`)}
  `;
  await sendMail(to, `${config.emoji} ${data.projectName} is now ${data.status.toUpperCase()}`, wrapEmail('Server Status', body));
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
      🔥 Weekend Hackathon Pass Activated!
    </h1>
    <p style="color:#475569;line-height:1.6;margin:0 0 20px;font-size:14px;">
      Hey ${data.username}, your 72-hour Pro access is live! Build and demo your project with maximum speed and capacity:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
      ${['2 vCPUs Dedicated Compute', '512MB High-Speed RAM', '5GB NVMe Storage', 'Priority Build Sandboxes', 'Automatic SSL Routing'].map(f => `
      <tr><td style="padding:6px 0;">
        <span style="color:#16A34A;font-weight:800;margin-right:8px;">✓</span>
        <span style="color:#0F172A;font-size:13px;font-weight:600;">${f}</span>
      </td></tr>`).join('')}
    </table>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#1E40AF;font-size:13px;font-weight:700;">⏰ Pass Valid Until: ${expiryStr} IST (72 Hours)</p>
    </div>
    ${ctaButton('Open Dashboard', 'https://code-host.online/dashboard')}
  `;
  await sendMail(to, '🔥 Hackathon Pass Activated — 72 Hours of Pro Access', wrapEmail('Hackathon Pass', body));
}
