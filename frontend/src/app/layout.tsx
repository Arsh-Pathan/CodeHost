import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://code-host.online"),
  title: {
    default: "CodeHost | The Simplest Cloud Platform for Developers & Students",
    template: "%s | CodeHost",
  },
  description: "Deploy Next.js, Python FastAPI, Go, Rust, Java, and 20+ frameworks in one click. Free tier forever, auto-HTTPS, persistent Postgres, and zero DevOps complexity.",
  keywords: [
    "CodeHost",
    "Cloud Hosting",
    "Student Developer Cloud",
    "One-click Deployment",
    "Free Next.js Hosting",
    "Python FastAPI Cloud",
    "Docker Container Platform",
    "Render Alternative",
    "Heroku Alternative",
    "Vercel Alternative India",
    "Free Postgres Database",
    "Fullstack App Deployment",
  ],
  authors: [{ name: "Arsh Pathan", url: "https://code-host.online" }],
  creator: "Arsh Pathan",
  publisher: "CodeHost",
  applicationName: "CodeHost",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://code-host.online",
  },
  openGraph: {
    title: "CodeHost | Cloud Made Simple for Developers",
    description: "The simplest cloud platform for students and developers. One-click deploy, persistent databases, free subdomains, and zero DevOps.",
    url: "https://code-host.online",
    siteName: "CodeHost",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CodeHost - Cloud Hosting Simplified",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeHost | Cloud Made Simple",
    description: "One-click deployment for 20+ frameworks. Start hosting free with zero terminal configuration.",
    images: ["/og-image.png"],
    creator: "@arshpathan",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CodeHost",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://code-host.online/#organization",
      "name": "CodeHost",
      "url": "https://code-host.online",
      "logo": {
        "@type": "ImageObject",
        "url": "https://code-host.online/icon.svg",
      },
      "sameAs": [
        "https://github.com/Arsh-Pathan/CodeHost",
        "https://discord.gg/gsh2qpEXT4"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://code-host.online/#website",
      "url": "https://code-host.online",
      "name": "CodeHost",
      "publisher": {
        "@id": "https://code-host.online/#organization",
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://code-host.online/docs?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "SoftwareApplication",
      "name": "CodeHost Cloud Platform",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Cloud",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR",
        "description": "Free starter tier with container deployment and subdomains"
      },
      "description": "One-click cloud hosting platform for developers and students supporting Next.js, Python, Go, Node, and 20+ stacks."
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
