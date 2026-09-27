import type { Metadata } from 'next';

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const certId = params.id;
  const shareTitle = 'Official Cloud Deployment Certificate | CodeHost';
  const shareDesc = 'Cryptographically verified production cloud deployment certificate issued by CodeHost for shipping live applications to the cloud.';

  return {
    title: shareTitle,
    description: shareDesc,
    openGraph: {
      title: shareTitle,
      description: shareDesc,
      url: `https://code-host.online/certificate/${encodeURIComponent(certId)}`,
      siteName: 'CodeHost',
      images: [
        {
          url: 'https://code-host.online/og-image.png',
          width: 1200,
          height: 630,
          alt: 'CodeHost Cloud Deployment Certificate',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDesc,
      images: ['https://code-host.online/og-image.png'],
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
