import type { Metadata } from 'next';

async function fetchCertForMetadata(id: string) {
  const candidates = [
    process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/certificates/verify/${encodeURIComponent(id)}` : null,
    `https://api.code-host.online/certificates/verify/${encodeURIComponent(id)}`,
    `http://localhost:4000/certificates/verify/${encodeURIComponent(id)}`,
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        if (json?.valid && json?.certificate) return json.certificate as { recipientName?: string; certNumber?: string };
      }
    } catch {
      // ignore unreachable candidate
    }
  }
  return null;
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const certId = params.id;
  const cert = await fetchCertForMetadata(certId);

  const shareTitle = cert
    ? `${cert.recipientName || 'Developer'} — Official Cloud Deployment Certificate | CodeHost`
    : 'Certificate Not Found | CodeHost';
  const shareDesc = cert
    ? `Verified production cloud deployment certificate${cert.certNumber ? ` (${cert.certNumber})` : ''} issued by CodeHost.`
    : 'This CodeHost deployment certificate could not be verified.';

  const ogImageUrl = `https://code-host.online/certificate/${encodeURIComponent(certId)}/opengraph-image`;

  return {
    title: shareTitle,
    description: shareDesc,
    ...(cert ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title: shareTitle,
      description: shareDesc,
      url: `https://code-host.online/certificate/${encodeURIComponent(certId)}`,
      siteName: 'CodeHost',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: shareTitle,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDesc,
      images: [ogImageUrl],
    },
  };
}

export default function CertificateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
