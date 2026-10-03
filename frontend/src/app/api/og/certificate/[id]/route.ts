import { NextRequest } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

async function getCertificate(id: string) {
  try {
    const candidateUrls = [
      `https://api.code-host.online/certificates/verify/${encodeURIComponent(id)}`,
      `http://localhost:4000/certificates/verify/${encodeURIComponent(id)}`,
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.valid && json.certificate) {
            return json.certificate;
          }
        }
      } catch {
        // try next candidate
      }
    }
  } catch {
    // fallback
  }
  return null;
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function buildCertificateSvg({
  recipientName,
  certNumber,
  issuedDate,
}: {
  recipientName: string;
  certNumber: string;
  issuedDate: string;
}) {
  const width = 1200;
  const height = 630;
  const safeName = escapeXml(recipientName);
  const safeCertNum = escapeXml(certNumber);
  const safeDate = escapeXml(issuedDate);

  const cardX = 44;
  const cardY = 28;
  const cardW = width - cardX * 2; // 1112
  const cardH = height - cardY * 2; // 574

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Premium soft drop shadow for certificate paper -->
      <filter id="certShadow" x="-4%" y="-4%" width="108%" height="112%" filterUnits="userSpaceOnUse">
        <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
        <feOffset dx="0" dy="8" />
        <feComponentTransfer><feFuncA type="linear" slope="0.07" /></feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Soft canvas background gradient -->
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#F8FAFC" />
        <stop offset="100%" stop-color="#E2E8F0" />
      </radialGradient>
    </defs>

    <!-- Outer Presentation Canvas Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

    <!-- ─── CERTIFICATE PAPER CARD ─── -->
    <g filter="url(#certShadow)">
      <!-- Main Certificate Paper Body (#F8FAFC) -->
      <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="16" fill="#F8FAFC" stroke="#0F172A" stroke-width="3" />

      <!-- Outer Inset Blue Border (#2563EB) -->
      <rect x="${cardX + 10}" y="${cardY + 10}" width="${cardW - 20}" height="${cardH - 20}" rx="12" fill="none" stroke="#2563EB" stroke-width="1.2" />

      <!-- Inner Inset Slate Border (#CBD5E1) -->
      <rect x="${cardX + 18}" y="${cardY + 18}" width="${cardW - 36}" height="${cardH - 36}" rx="9" fill="none" stroke="#CBD5E1" stroke-width="1" />

      <!-- Precision Stepped Corner Brackets (#2563EB) -->
      <!-- Top-Left -->
      <path d="M ${cardX + 10} ${cardY + 30} L ${cardX + 10} ${cardY + 10} L ${cardX + 30} ${cardY + 10}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />
      <!-- Top-Right -->
      <path d="M ${cardX + cardW - 30} ${cardY + 10} L ${cardX + cardW - 10} ${cardY + 10} L ${cardX + cardW - 10} ${cardY + 30}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />
      <!-- Bottom-Left -->
      <path d="M ${cardX + 10} ${cardY + cardH - 30} L ${cardX + 10} ${cardY + cardH - 10} L ${cardX + 30} ${cardY + cardH - 10}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />
      <!-- Bottom-Right -->
      <path d="M ${cardX + cardW - 30} ${cardY + cardH - 10} L ${cardX + cardW - 10} ${cardY + cardH - 10} L ${cardX + cardW - 10} ${cardY + cardH - 30}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />

      <!-- ─── HEADER: OFFICIAL LOGO & TITLE ─── -->
      <g transform="translate(600, ${cardY + 38})" text-anchor="middle">
        <!-- Official CodeHost 3-Stack Logo -->
        <g transform="translate(-22, 0)">
          <svg width="44" height="44" viewBox="0 0 1024 1024" fill="none">
            <polygon points="512,520 820,730 512,920 204,730" stroke="#2563EB" stroke-width="65" fill="#FFFFFF" stroke-linejoin="round" />
            <polygon points="512,320 820,530 512,720 204,530" stroke="#2563EB" stroke-width="65" fill="#FFFFFF" stroke-linejoin="round" />
            <polygon points="512,120 820,320 512,520 204,320" stroke="#2563EB" stroke-width="65" fill="#FFFFFF" stroke-linejoin="round" />
          </svg>
        </g>

        <!-- Authority Subtitle -->
        <text x="0" y="66" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" letter-spacing="3" fill="#2563EB">
          CODEHOST DEVELOPER COMMUNITY
        </text>

        <!-- Main Title (Georgia Bold Serif) -->
        <text x="0" y="102" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="900" letter-spacing="-0.5" fill="#0F172A">
          CERTIFICATE OF CLOUD DEPLOYMENT
        </text>

        <!-- Recognition Tagline -->
        <text x="0" y="125" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="700" letter-spacing="2.2" fill="#64748B">
          STUDENT &amp; DEVELOPER RECOGNITION
        </text>
      </g>

      <!-- ─── CONFERRAL STATEMENT & RECIPIENT ─── -->
      <g transform="translate(600, ${cardY + 208})" text-anchor="middle">
        <!-- Award Intro -->
        <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="600" letter-spacing="2" fill="#64748B">
          THIS CERTIFICATE IS PROUDLY AWARDED TO
        </text>

        <!-- Recipient Name (Large Serif) -->
        <text x="0" y="44" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="900" letter-spacing="-0.5" fill="#0F172A">
          ${safeName}
        </text>

        <!-- Academic Diamond Flourish -->
        <g transform="translate(0, 62)">
          <line x1="-85" y1="0" x2="-10" y2="0" stroke="#2563EB" stroke-width="1.2" />
          <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#2563EB" />
          <line x1="10" y1="0" x2="85" y2="0" stroke="#2563EB" stroke-width="1.2" />
        </g>

        <!-- Conferral Statement Description -->
        <text x="0" y="94" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#475569">
          for taking the leap to build and successfully launch their project live on the CodeHost cloud platform.
        </text>

        <!-- Highlights Row: Live on the Cloud • Automatic HTTPS • Public Web Access -->
        <g transform="translate(0, 126)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">
          <line x1="-280" y1="-16" x2="280" y2="-16" stroke="#E2E8F0" stroke-width="1" />
          <line x1="-280" y1="16" x2="280" y2="16" stroke="#E2E8F0" stroke-width="1" />

          <!-- Item 1: Rocket Icon + Live on the Cloud -->
          <g transform="translate(-215, 0)">
            <g transform="translate(0, -9) scale(0.68)">
              <path d="M 4.5 16.5 c -1.5 1.26 -2 5 -2 5 s 3.74 -0.5 5 -2 c 0.71 -0.84 0.7 -2.13 -0.09 -2.91 a 2.18 2.18 0 0 0 -2.91 -0.09 z" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="m 12 15 l -3 -3 a 22 22 0 0 1 2 -3.95 A 12.88 12.88 0 0 1 22 2 c 0 2.72 -0.78 7.5 -6 11 a 22.35 22.35 0 0 1 -4 2 z" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M 9 9 L 15 15" stroke="#2563EB" stroke-width="2" stroke-linecap="round" />
            </g>
            <text x="20" y="0" text-anchor="start" fill="#1E293B">Live on the Cloud</text>
          </g>

          <!-- Bullet 1 -->
          <circle cx="-60" cy="-3.5" r="2.5" fill="#CBD5E1" />

          <!-- Item 2: Lock Icon + Automatic HTTPS -->
          <g transform="translate(-35, 0)">
            <g transform="translate(0, -9) scale(0.68)">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M 7 11 V 7 a 5 5 0 0 1 10 0 v 4" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </g>
            <text x="18" y="0" text-anchor="start" fill="#1E293B">Automatic HTTPS</text>
          </g>

          <!-- Bullet 2 -->
          <circle cx="115" cy="-3.5" r="2.5" fill="#CBD5E1" />

          <!-- Item 3: Globe Icon + Public Web Access -->
          <g transform="translate(140, 0)">
            <g transform="translate(0, -9) scale(0.68)">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="2" y1="12" x2="22" y2="12" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M 12 2 a 15.3 15.3 0 0 1 4 10 a 15.3 15.3 0 0 1 -4 10 a 15.3 15.3 0 0 1 -4 -10 a 15.3 15.3 0 0 1 4 -10 z" fill="none" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </g>
            <text x="20" y="0" text-anchor="start" fill="#1E293B">Public Web Access</text>
          </g>
        </g>
      </g>

      <!-- ─── BOTTOM METADATA & QR CODE ROW ─── -->
      <g transform="translate(${cardX + 40}, ${cardY + cardH - 116})">
        <!-- Top Divider Line -->
        <line x1="0" y1="0" x2="${cardW - 80}" y2="0" stroke="#E2E8F0" stroke-width="1.2" />

        <!-- 4-Column Metadata Grid -->
        <g transform="translate(0, 20)">
          <!-- Col 1: Certificate ID -->
          <g transform="translate(0, 0)">
            <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="800" letter-spacing="1.2" fill="#94A3B8">CERTIFICATE ID</text>
            <text x="0" y="22" font-family="monospace" font-size="13" font-weight="900" fill="#0F172A">${safeCertNum}</text>
          </g>

          <!-- Col 2: Date Issued -->
          <g transform="translate(180, 0)">
            <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="800" letter-spacing="1.2" fill="#94A3B8">DATE ISSUED</text>
            <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12.5" font-weight="700" fill="#0F172A">${safeDate}</text>
          </g>

          <!-- Col 3: Issued By -->
          <g transform="translate(370, 0)">
            <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="800" letter-spacing="1.2" fill="#94A3B8">ISSUED BY</text>
            <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12.5" font-weight="700" fill="#0F172A">Code Host</text>
          </g>

          <!-- Col 4: Status -->
          <g transform="translate(530, 0)">
            <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="800" letter-spacing="1.2" fill="#94A3B8">STATUS</text>
            <g transform="translate(0, 22)">
              <circle cx="6" cy="-4" r="7" fill="#DCFCE7" />
              <path d="M 2 -4 L 5 -1 L 10 -7" stroke="#15803D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              <text x="18" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12.5" font-weight="800" fill="#15803D">Active &amp; Verified</text>
            </g>
          </g>
        </g>

        <!-- Right: Official Verification Brand & QR Code -->
        <g transform="translate(${cardW - 80}, 0)">
          <text x="-76" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="end" fill="#0F172A">CodeHost Cloud</text>
          <text x="-76" y="34" font-family="monospace" font-size="10" font-weight="700" text-anchor="end" fill="#2563EB">code-host.online</text>

          <!-- QR Code Frame -->
          <g transform="translate(-62, 0)">
            <rect x="0" y="0" width="60" height="60" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
            <!-- Realistic QR Code Graphic -->
            <g transform="translate(7, 7) scale(0.66)">
              <!-- Finder 1 -->
              <rect x="0" y="0" width="22" height="22" fill="#0F172A" rx="2" />
              <rect x="3" y="3" width="16" height="16" fill="#FFFFFF" rx="1" />
              <rect x="6" y="6" width="10" height="10" fill="#0F172A" rx="1" />
              <!-- Finder 2 -->
              <rect x="46" y="0" width="22" height="22" fill="#0F172A" rx="2" />
              <rect x="49" y="3" width="16" height="16" fill="#FFFFFF" rx="1" />
              <rect x="52" y="6" width="10" height="10" fill="#0F172A" rx="1" />
              <!-- Finder 3 -->
              <rect x="0" y="46" width="22" height="22" fill="#0F172A" rx="2" />
              <rect x="3" y="49" width="16" height="16" fill="#FFFFFF" rx="1" />
              <rect x="6" y="52" width="10" height="10" fill="#0F172A" rx="1" />
              <!-- Data bits -->
              <rect x="26" y="4" width="4" height="4" fill="#0F172A" />
              <rect x="36" y="4" width="4" height="4" fill="#0F172A" />
              <rect x="28" y="14" width="8" height="4" fill="#0F172A" />
              <rect x="4" y="28" width="4" height="6" fill="#0F172A" />
              <rect x="14" y="26" width="4" height="4" fill="#0F172A" />
              <rect x="26" y="26" width="6" height="6" fill="#0F172A" />
              <rect x="36" y="28" width="4" height="8" fill="#0F172A" />
              <rect x="46" y="26" width="6" height="4" fill="#0F172A" />
              <rect x="58" y="28" width="6" height="6" fill="#0F172A" />
              <rect x="26" y="38" width="12" height="4" fill="#0F172A" />
              <rect x="44" y="36" width="4" height="8" fill="#0F172A" />
              <rect x="26" y="48" width="4" height="12" fill="#0F172A" />
              <rect x="34" y="52" width="8" height="6" fill="#0F172A" />
              <rect x="48" y="48" width="12" height="4" fill="#0F172A" />
              <rect x="54" y="56" width="8" height="6" fill="#0F172A" />
            </g>
            <text x="30" y="71" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7" font-weight="900" letter-spacing="0.5" fill="#64748B" text-anchor="middle">
              SCAN TO VERIFY
            </text>
          </g>
        </g>
      </g>
    </g>
  </svg>
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cert = await getCertificate(id);

  const recipientName = cert?.recipientName || 'Cloud Developer';
  const certNumber = cert?.certNumber || (id.length > 12 ? `${id.slice(0, 4).toUpperCase()}-${id.slice(-4).toUpperCase()}` : id.toUpperCase());
  const issuedDate = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const svg = buildCertificateSvg({ recipientName, certNumber, issuedDate });
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
