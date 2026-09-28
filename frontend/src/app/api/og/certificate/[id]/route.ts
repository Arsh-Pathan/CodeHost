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

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Clean Certificate Background (Matches #F8FAFC) -->
    <rect width="${width}" height="${height}" fill="#F8FAFC" />

    <!-- ─── OUTER BORDERS & CONCENTRIC ARCHITECTURE ─── -->
    <!-- Outer Dark Charcoal Frame (3px solid #0F172A) -->
    <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="14" fill="none" stroke="#0F172A" stroke-width="3" />

    <!-- Inner Blue Border (#2563EB) -->
    <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="10" fill="none" stroke="#2563EB" stroke-width="1.2" />

    <!-- Inner Slate Border (#CBD5E1) -->
    <rect x="25" y="25" width="${width - 50}" height="${height - 50}" rx="8" fill="none" stroke="#CBD5E1" stroke-width="1" />

    <!-- Precision Stepped Corner Brackets (#2563EB) -->
    <!-- Top-Left -->
    <path d="M 18 36 L 18 18 L 36 18" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />
    <!-- Top-Right -->
    <path d="M ${width - 36} 18 L ${width - 18} 18 L ${width - 18} 36" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />
    <!-- Bottom-Left -->
    <path d="M 18 ${height - 36} L 18 ${height - 18} L 36 ${height - 18}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />
    <!-- Bottom-Right -->
    <path d="M ${width - 36} ${height - 18} L ${width - 18} ${height - 18} L ${width - 18} ${height - 36}" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="square" />

    <!-- ─── FADED BACKGROUND WATERMARK (Airy Blue/White, Exactly like webpage) ─── -->
    <g transform="translate(600, 310)" text-anchor="middle">
      <!-- Watermark 3-Stack CodeHost Logo (Centered, 340px) -->
      <g transform="translate(-170, -170) scale(0.332)" opacity="0.065">
        <polygon points="512,520 820,730 512,920 204,730" stroke="#2563EB" stroke-width="50" fill="#FFFFFF" stroke-linejoin="round" />
        <polygon points="512,320 820,530 512,720 204,530" stroke="#2563EB" stroke-width="50" fill="#FFFFFF" stroke-linejoin="round" />
        <polygon points="512,120 820,320 512,520 204,320" stroke="#2563EB" stroke-width="50" fill="#FFFFFF" stroke-linejoin="round" />
      </g>
    </g>

    <!-- Faint Developer Floating Code Symbols (Matches webpage) -->
    <g font-family="monospace" font-size="12" font-weight="700" opacity="0.08">
      <text x="70" y="90" fill="#334155">&gt;_</text>
      <text x="100" y="115" fill="#2563EB">git push codehost main</text>
      <text x="1010" y="115" fill="#334155">&lt;CloudDeploy /&gt;</text>
      <text x="70" y="320" fill="#334155">{ }</text>
      <text x="100" y="340" fill="#334155">status: &quot;running&quot;</text>
      <text x="960" y="340" fill="#2563EB">docker compose up -d</text>
    </g>

    <!-- ─── CERTIFICATE HEADER ─── -->
    <g transform="translate(600, 68)" text-anchor="middle">
      <!-- Official CodeHost 3-Stack Logo -->
      <g transform="translate(-24, 0)">
        <svg width="48" height="48" viewBox="0 0 1024 1024" fill="none">
          <polygon points="512,520 820,730 512,920 204,730" stroke="#2563EB" stroke-width="65" fill="#FFFFFF" stroke-linejoin="round" />
          <polygon points="512,320 820,530 512,720 204,530" stroke="#2563EB" stroke-width="65" fill="#FFFFFF" stroke-linejoin="round" />
          <polygon points="512,120 820,320 512,520 204,320" stroke="#2563EB" stroke-width="65" fill="#FFFFFF" stroke-linejoin="round" />
        </svg>
      </g>

      <!-- Authority Subtitle -->
      <text x="0" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="3.5" fill="#2563EB">
        CODEHOST DEVELOPER COMMUNITY
      </text>

      <!-- Main Certificate Title (Uppercase Serif, Exactly like webpage) -->
      <text x="0" y="112" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="900" letter-spacing="-0.5" fill="#0F172A">
        CERTIFICATE OF CLOUD DEPLOYMENT
      </text>

      <!-- Recognition Tagline -->
      <text x="0" y="136" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="2.5" fill="#64748B">
        STUDENT &amp; DEVELOPER RECOGNITION
      </text>
    </g>

    <!-- ─── RECIPIENT CONFERRAL STATEMENT ─── -->
    <g transform="translate(600, 245)" text-anchor="middle">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="2" fill="#64748B">
        THIS CERTIFICATE IS PROUDLY AWARDED TO
      </text>

      <!-- Recipient Name in Large Elegant Serif -->
      <text x="0" y="48" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="900" letter-spacing="-0.5" fill="#0F172A">
        ${safeName}
      </text>

      <!-- Academic Diamond Flourish (Matches webpage) -->
      <g transform="translate(0, 68)">
        <line x1="-90" y1="0" x2="-10" y2="0" stroke="#2563EB" stroke-width="1.2" />
        <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#2563EB" />
        <line x1="10" y1="0" x2="90" y2="0" stroke="#2563EB" stroke-width="1.2" />
      </g>

      <!-- Genuine, Light Conferral Statement -->
      <text x="0" y="104" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#475569">
        for taking the leap to build and successfully launch their project live on the CodeHost cloud platform.
      </text>

      <!-- Deployment Highlights Row -->
      <g transform="translate(0, 138)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#334155">
        <line x1="-280" y1="-18" x2="280" y2="-18" stroke="#E2E8F0" stroke-width="1" />
        <line x1="-280" y1="18" x2="280" y2="18" stroke="#E2E8F0" stroke-width="1" />

        <text x="-160" y="4" fill="#1E293B">Live on the Cloud</text>
        <circle cx="-65" cy="0" r="2.5" fill="#CBD5E1" />
        <text x="0" y="4" fill="#1E293B">Automatic HTTPS</text>
        <circle cx="65" cy="0" r="2.5" fill="#CBD5E1" />
        <text x="160" y="4" fill="#1E293B">Public Web Access</text>
      </g>
    </g>

    <!-- ─── BOTTOM METADATA & QR CODE VERIFICATION ROW ─── -->
    <g transform="translate(56, 490)">
      <!-- Top Dividing Line -->
      <line x1="0" y1="0" x2="${width - 112}" y2="0" stroke="#E2E8F0" stroke-width="1.2" />

      <!-- Left: 4-Column Metadata Grid -->
      <g transform="translate(0, 24)">
        <!-- Col 1: Certificate ID -->
        <g transform="translate(0, 0)">
          <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" letter-spacing="1.2" fill="#94A3B8">CERTIFICATE ID</text>
          <text x="0" y="22" font-family="monospace" font-size="13" font-weight="900" fill="#0F172A">${safeCertNum}</text>
        </g>

        <!-- Col 2: Date Issued -->
        <g transform="translate(190, 0)">
          <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" letter-spacing="1.2" fill="#94A3B8">DATE ISSUED</text>
          <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#0F172A">${safeDate}</text>
        </g>

        <!-- Col 3: Issued By -->
        <g transform="translate(390, 0)">
          <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" letter-spacing="1.2" fill="#94A3B8">ISSUED BY</text>
          <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#0F172A">Code Host</text>
        </g>

        <!-- Col 4: Status -->
        <g transform="translate(560, 0)">
          <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" letter-spacing="1.2" fill="#94A3B8">STATUS</text>
          <g transform="translate(0, 22)">
            <circle cx="6" cy="-4" r="7" fill="#DCFCE7" />
            <path d="M 2 -4 L 5 -1 L 10 -7" stroke="#15803D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            <text x="18" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#15803D">Active &amp; Verified</text>
          </g>
        </g>
      </g>

      <!-- Right: Official Verification Seal & QR Code Block -->
      <g transform="translate(${width - 112}, 16)">
        <text x="-80" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="end" fill="#0F172A">CodeHost Cloud</text>
        <text x="-80" y="30" font-family="monospace" font-size="10" font-weight="700" text-anchor="end" fill="#2563EB">code-host.online</text>

        <!-- Scannable QR Code Box -->
        <g transform="translate(-62, -2)">
          <rect x="0" y="0" width="62" height="62" rx="10" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
          <!-- QR Matrix Graphic -->
          <g transform="translate(8, 8) scale(0.68)">
            <!-- Corner Finder 1 -->
            <rect x="0" y="0" width="22" height="22" fill="#0F172A" rx="2" />
            <rect x="3" y="3" width="16" height="16" fill="#FFFFFF" rx="1" />
            <rect x="6" y="6" width="10" height="10" fill="#0F172A" rx="1" />

            <!-- Corner Finder 2 -->
            <rect x="46" y="0" width="22" height="22" fill="#0F172A" rx="2" />
            <rect x="49" y="3" width="16" height="16" fill="#FFFFFF" rx="1" />
            <rect x="52" y="6" width="10" height="10" fill="#0F172A" rx="1" />

            <!-- Corner Finder 3 -->
            <rect x="0" y="46" width="22" height="22" fill="#0F172A" rx="2" />
            <rect x="3" y="49" width="16" height="16" fill="#FFFFFF" rx="1" />
            <rect x="6" y="52" width="10" height="10" fill="#0F172A" rx="1" />

            <!-- Data Bits -->
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

          <text x="31" y="73" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7" font-weight="900" letter-spacing="0.5" fill="#64748B" text-anchor="middle">
            SCAN TO VERIFY
          </text>
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
