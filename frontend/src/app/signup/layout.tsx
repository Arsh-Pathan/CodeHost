import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Create Your Account",
  description: "Sign up for CodeHost to deploy Next.js, Python, Node, or Go applications in seconds with automatic HTTPS subdomains and zero DevOps.",
  alternates: {
    canonical: "https://code-host.online/signup",
  },
  openGraph: {
    title: "Create Your Cloud Account | CodeHost",
    description: "Deploy Next.js, Python, Go, Node, and 20+ frameworks with instant subdomains and automated SSL.",
    url: "https://code-host.online/signup",
    siteName: "CodeHost Cloud",
    images: [
      {
        url: "https://code-host.online/og-image.png",
        width: 1200,
        height: 630,
        alt: "CodeHost Cloud Deployment Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Your Cloud Account | CodeHost",
    description: "Deploy Next.js, Python, Go, Node, and 20+ frameworks with instant subdomains and automated SSL.",
    images: ["https://code-host.online/og-image.png"],
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
