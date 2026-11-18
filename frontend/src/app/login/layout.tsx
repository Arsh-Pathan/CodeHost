import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your CodeHost account to manage cloud deployments, live container logs, custom domains, and prepaid compute credits.',
  alternates: {
    canonical: 'https://code-host.online/login',
  },
  openGraph: {
    title: 'Sign In | CodeHost',
    description: 'Access your CodeHost cloud workspace, live logs, and container deployments.',
    url: 'https://code-host.online/login',
    siteName: 'CodeHost',
    type: 'website',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
