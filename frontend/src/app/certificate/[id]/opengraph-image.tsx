import { ImageResponse } from 'next/og';

export const alt = 'CodeHost Official Cloud Deployment Certificate';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

async function getCertificate(id: string) {
  const candidateUrls = [
    process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/certificates/verify/${encodeURIComponent(id)}`
      : null,
    `https://api.code-host.online/certificates/verify/${encodeURIComponent(id)}`,
    `http://localhost:4000/certificates/verify/${encodeURIComponent(id)}`,
  ].filter(Boolean) as string[];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 3600 },
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.valid && json.certificate) {
          return json.certificate as { recipientName?: string; certNumber?: string; issuedAt?: string };
        }
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await getCertificate(id);

  if (!cert) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            fontFamily: 'sans-serif',
            color: '#0F172A',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#64748B',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            CodeHost Verification Registry
          </div>
          <div style={{ fontSize: '42px', fontWeight: 900, color: '#0F172A' }}>
            Certificate Not Found — Unverified
          </div>
        </div>
      ),
      size
    );
  }

  const recipientName = cert.recipientName || 'Cloud Developer';
  const certNumber =
    cert.certNumber ||
    (id.length > 12 ? `${id.slice(0, 4).toUpperCase()}-${id.slice(-4).toUpperCase()}` : id.toUpperCase());
  const issuedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Verified';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F1F5F9',
          padding: '28px 36px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            border: '3px solid #0F172A',
            borderRadius: '16px',
            padding: '44px 52px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '1px' }}>
              CODEHOST CLOUD
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '8px 16px',
                borderRadius: '999px',
              }}
            >
              OFFICIAL VERIFIED CREDENTIAL
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#64748B',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Certificate of Cloud Deployment
            </div>
            <div style={{ fontSize: '58px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>
              {recipientName}
            </div>
            <div style={{ fontSize: '20px', color: '#475569', maxWidth: '820px' }}>
              Successfully deployed a live production web application on CodeHost Cloud Infrastructure.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '18px',
            }}
          >
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Certificate ID
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                  {certNumber}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Date Issued
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{issuedDate}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Status
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>Active &amp; Verified</span>
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
              code-host.online
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
