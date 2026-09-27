import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Join CodeHost | Claim 50 Free Cloud Deployment Credits",
  description: "You have been invited to CodeHost! Sign up today to claim 50 free cloud credits and deploy your Next.js, Python, Node, or Go projects in seconds with automatic SSL and zero DevOps.",
  openGraph: {
    title: "Claim 50 Free Cloud Credits on CodeHost",
    description: "Deploy Next.js, Python, Go, Node, and 20+ frameworks with persistent databases, instant subdomains, and zero DevOps.",
    url: "https://code-host.online/signup",
    siteName: "CodeHost Cloud",
    images: [
      {
        url: "https://code-host.online/og-image.png",
        width: 1200,
        height: 630,
        alt: "CodeHost Referral Invite - 50 Free Cloud Credits",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claim 50 Free Cloud Credits on CodeHost",
    description: "Deploy Next.js, Python, Go, Node, and 20+ frameworks with persistent databases, instant subdomains, and zero DevOps.",
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
