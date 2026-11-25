import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
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
    "MCP Server Cloud Deployment",
    "LLM Cloud Hosting",
    "AI Agent Deployment Platform",
    "Deploy with Claude MCP",
    "Model Context Protocol Hosting",
    "Student Hackathon Cloud Pass",
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
    icon: [
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
      { url: "/favicon.ico?v=4" },
    ],
    shortcut: "/icon.svg?v=4",
    apple: "/apple-touch-icon.png?v=4",
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
        "url": "https://code-host.online/logo.png",
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
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "highPrice": "640",
        "priceCurrency": "INR",
        "offerCount": "5",
        "description": "Free tier forever plus prepaid Basic (₹80), Pro (₹240), Business (₹640), and Weekend Hackathon Pass (₹49)"
      },
      "description": "One-click cloud hosting platform for developers and students supporting Next.js, Python, Go, Node, 20+ stacks, and MCP server deployments."
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does CodeHost's Free Tier and prepaid credit system work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The Free tier includes 128 MB RAM, 0.5 vCPU, 1 GB NVMe storage, and free HTTPS subdomains forever at ₹0 (hibernating after 30 minutes of inactivity). For 24/7 uptime, custom domains, and higher resources, you buy prepaid credits (1 credit = ₹1.60 / $0.02) starting with the 50-credit Starter Pack at ₹80."
          }
        },
        {
          "@type": "Question",
          "name": "How can I deploy applications via GitHub, ZIP, or an AI MCP Server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can connect a public GitHub repository, upload a ZIP archive, use the built-in browser file manager, or connect an LLM agent (such as Claude, Cursor, or Antigravity) to CodeHost's Model Context Protocol (MCP) server at https://api.code-host.online/mcp."
          }
        },
        {
          "@type": "Question",
          "name": "Which programming languages, frameworks, and databases are supported?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "CodeHost automatically detects and builds over 20 stacks including Next.js, Node.js, Express, Bun, Deno, Python (FastAPI, Django, Flask), Go, Rust, Java, PHP, .NET, Ruby, and custom Dockerfiles, alongside managed PostgreSQL, MySQL, Redis, and MongoDB."
          }
        },
        {
          "@type": "Question",
          "name": "Does CodeHost support custom domains and automatic SSL?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Every project receives a free https://<project>.code-host.online subdomain with automatic Let's Encrypt TLS. Custom apex and subdomains with automated SSL are included on Basic, Pro, and Business plans."
          }
        }
      ]
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
        <link rel="preconnect" href="https://api.code-host.online" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.code-host.online" />
        <link rel="alternate" type="text/plain" title="LLM Summary (llms.txt)" href="https://code-host.online/llms.txt" />
        <link rel="alternate" type="text/plain" title="LLM Full Documentation (llms-full.txt)" href="https://code-host.online/llms-full.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
