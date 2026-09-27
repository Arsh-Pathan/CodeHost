import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Official Cloud Deployment Certificate | CodeHost Credential Registry',
  description: 'Cryptographically verified production cloud deployment certificate issued by CodeHost Cloud Infrastructure.',
  openGraph: {
    title: 'Official Cloud Deployment Certificate | CodeHost',
    description: 'Cryptographically verified production cloud deployment certificate issued by CodeHost Cloud Infrastructure.',
    url: 'https://code-host.online',
    siteName: 'CodeHost',
    images: [
      {
        url: 'https://code-host.online/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CodeHost Verified Deployment Certificate',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Official Cloud Deployment Certificate | CodeHost',
    description: 'Cryptographically verified production cloud deployment certificate issued by CodeHost.',
    images: ['https://code-host.online/og-image.png'],
  },
};

export default function CertificateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
