import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "CodeHost | The Simplest Cloud Platform for Students",
  description: "Deploy Node.js, Python, and Static projects in one click. No Linux, no Docker, no terminals. Just code and host.",
  keywords: ["CodeHost", "Cloud Hosting", "Student Developer", "One-click Deployment", "Website Hosting"],
  authors: [{ name: "Arsh Pathan" }],
  openGraph: {
    title: "CodeHost | Cloud Made Simple",
    description: "The simplest cloud platform for students. One-click and your project is online.",
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
    description: "The simplest cloud platform for students. One-click and your project is online.",
    images: ["/og-image.png"],
    creator: "@arshpathan",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
