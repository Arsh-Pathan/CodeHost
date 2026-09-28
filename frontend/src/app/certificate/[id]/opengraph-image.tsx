import { ImageResponse } from 'next/og';

export const alt = 'CodeHost Official Cloud Deployment Certificate';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
        // try next
      }
    }
  } catch {
    // fallback
  }
  return null;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
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
          backgroundColor: '#F1F5F9',
          padding: '24px 32px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Certificate Card Frame */}
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
            padding: '26px 40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Inner concentric border (Blue) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              bottom: '12px',
              border: '1px solid #2563EB',
              borderRadius: '10px',
            }}
          />

          {/* Inner concentric border (Slate) */}
          <div
            style={{
              position: 'absolute',
              top: '18px',
              left: '18px',
              right: '18px',
              bottom: '18px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
            }}
          />

          {/* Stepped Corner Brackets */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', width: '16px', height: '16px', borderTop: '3px solid #2563EB', borderLeft: '3px solid #2563EB' }} />
          <div style={{ position: 'absolute', top: '12px', right: '12px', width: '16px', height: '16px', borderTop: '3px solid #2563EB', borderRight: '3px solid #2563EB' }} />
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '16px', height: '16px', borderBottom: '3px solid #2563EB', borderLeft: '3px solid #2563EB' }} />
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '16px', height: '16px', borderBottom: '3px solid #2563EB', borderRight: '3px solid #2563EB' }} />

          {/* Faded Watermark Center Logo */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.05,
            }}
          >
            <svg width="420" height="420" viewBox="0 0 1024 1024" fill="none">
              <polygon points="512,520 820,730 512,920 204,730" stroke="#0F172A" strokeWidth="60" fill="#0F172A" />
              <polygon points="512,320 820,530 512,720 204,530" stroke="#0F172A" strokeWidth="60" fill="#0F172A" />
              <polygon points="512,120 820,320 512,520 204,320" stroke="#0F172A" strokeWidth="60" fill="#0F172A" />
            </svg>
          </div>

          {/* ─── HEADER ─── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            {/* Official CodeHost 3-Stack Logo */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <svg width="44" height="44" viewBox="0 0 1024 1024" fill="none">
                <polygon points="512,520 820,730 512,920 204,730" stroke="#2563EB" strokeWidth="65" fill="#FFFFFF" />
                <polygon points="512,320 820,530 512,720 204,530" stroke="#2563EB" strokeWidth="65" fill="#FFFFFF" />
                <polygon points="512,120 820,320 512,520 204,320" stroke="#2563EB" strokeWidth="65" fill="#FFFFFF" />
              </svg>
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 900,
                color: '#2563EB',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginBottom: '2px',
              }}
            >
              CodeHost Developer Community
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-0.5px',
                textTransform: 'uppercase',
                fontFamily: 'serif',
                marginBottom: '2px',
              }}
            >
              Certificate of Cloud Deployment
            </div>

            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#64748B',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Student &amp; Developer Recognition
            </div>
          </div>

          {/* ─── RECIPIENT CONFERRAL ─── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 10,
              margin: '4px 0',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '2px',
              }}
            >
              This certificate is proudly awarded to
            </div>

            {/* Recipient Name in Big Bold Serif */}
            <div
              style={{
                fontSize: '40px',
                fontWeight: 900,
                color: '#0F172A',
                fontFamily: 'serif',
                letterSpacing: '-0.5px',
                textTransform: 'capitalize',
                marginBottom: '2px',
              }}
            >
              {recipientName}
            </div>

            {/* Diamond flourish */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '60px', height: '1px', backgroundColor: '#2563EB' }} />
              <div style={{ width: '6px', height: '6px', backgroundColor: '#2563EB', transform: 'rotate(45deg)' }} />
              <div style={{ width: '60px', height: '1px', backgroundColor: '#2563EB' }} />
            </div>

            <div
              style={{
                fontSize: '13px',
                color: '#475569',
                fontWeight: 500,
                maxWidth: '680px',
                textAlign: 'center',
                lineHeight: '1.4',
              }}
            >
              for taking the leap to build and successfully launch their project live on the CodeHost cloud platform.
            </div>

            {/* Key highlights */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '6px 20px',
                borderTop: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                marginTop: '8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#334155',
              }}
            >
              <span>Live on the Cloud</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span>Automatic HTTPS</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span>Public Web Access</span>
            </div>
          </div>

          {/* ─── BOTTOM METADATA ROW ─── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '12px',
              zIndex: 10,
            }}
          >
            {/* Metadata Grid */}
            <div style={{ display: 'flex', gap: '36px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase' }}>Certificate ID</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>{certNumber}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase' }}>Date Issued</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{issuedDate}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase' }}>Issued By</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Code Host</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase' }}>Status</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>Active &amp; Verified</span>
              </div>
            </div>

            {/* Official Registry Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>Official Verified Credential</span>
              <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, fontFamily: 'monospace' }}>code-host.online</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
