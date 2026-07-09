import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — CodeHost',
  description: 'CodeHost Privacy Policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-2xl px-8 py-5 flex items-center justify-between">
        <LogoWithText />
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/#features" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Features</Link>
          <Link href="/#pricing" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Pricing</Link>
          <Link href="/docs" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Docs</Link>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">Login</Link>
          <Link href="/signup" className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-40 pb-24 px-6 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors mb-12">
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4">Privacy Policy</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-16">Last updated: March 19, 2026</p>

        <div className="space-y-12 text-slate-600 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">1. What Data We Collect</h2>
            <p className="mb-4">When you use CodeHost, we may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account information:</strong> Name, email address, username, and password hash when you sign up. If you sign in via Google or GitHub, we receive your name, email address, and OAuth provider user ID from the respective service.</li>
              <li><strong>Project data:</strong> Source code, files, and configuration you upload for deployment.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, deployment frequency, and session duration.</li>
              <li><strong>Build & runtime logs:</strong> Console output generated during project builds and execution.</li>
              <li><strong>Device information:</strong> Browser type, operating system, and IP address for security and analytics.</li>
              <li><strong>Payment Information:</strong> When you purchase credits, our third-party payment processor (Razorpay) collects your payment details. We only receive and store transaction metadata, including Razorpay Order IDs, Payment IDs, and the amount of credits purchased. We do not store full credit card numbers or other sensitive financial credentials.</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">2. How We Use Your Data</h2>
            <p className="mb-4">We use the data we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate your identity and manage your account, including via third-party OAuth providers (Google, GitHub).</li>
              <li>Build, deploy, and serve your projects on CodeHost infrastructure.</li>
              <li>Stream real-time build and runtime logs to your dashboard via WebSockets.</li>
              <li>Monitor platform health, detect abuse, and enforce resource limits.</li>
              <li>Improve the platform based on aggregated, anonymized usage patterns.</li>
              <li>Send transactional emails, including email verification links and important account notifications.</li>
              <li>Communicate important updates about your account or the service.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">3. Cookies & Tracking</h2>
            <p>
              CodeHost uses JWT (JSON Web Tokens) stored in your browser&apos;s local storage for authentication. We do not use third-party tracking cookies or advertising networks. We may use minimal, privacy-respecting analytics to understand how users interact with the platform. No data is sold to third parties.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">4. Data Security</h2>
            <p className="mb-4">We take reasonable measures to protect your data, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Passwords are hashed using industry-standard algorithms before storage.</li>
              <li>All deployed projects run in sandboxed Docker containers with strict resource limits (128MB RAM default).</li>
              <li>Communication between your browser and CodeHost servers is encrypted via HTTPS/TLS.</li>
              <li>Database access is restricted to internal services only, with no public exposure.</li>
            </ul>
            <p className="mt-4">
              While we strive to protect your data, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">5. Third-Party Services</h2>
            <p className="mb-4">CodeHost relies on the following third-party infrastructure and services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Docker:</strong> Used for building and running project containers in isolated environments.</li>
              <li><strong>Traefik:</strong> Reverse proxy handling dynamic routing and SSL termination.</li>
              <li><strong>PostgreSQL:</strong> Database for storing user accounts, project metadata, and deployment records.</li>
              <li><strong>Redis:</strong> Used for caching, session management, and real-time event handling.</li>
              <li><strong>Google OAuth:</strong> If you choose to sign in with Google, we exchange an authorization code with Google&apos;s servers to receive your name, email address, and Google user ID. We do not store your Google password or access token beyond the initial sign-in.</li>
              <li><strong>GitHub OAuth:</strong> If you choose to sign in with GitHub, we exchange an authorization code with GitHub&apos;s servers to receive your name, email address, and GitHub user ID. We do not store your GitHub password or access token beyond the initial sign-in.</li>
              <li><strong>Razorpay (Payments):</strong> We use Razorpay to process your credit purchases. Razorpay collects your payment information directly. You can find their privacy policy at <a href="https://razorpay.com/privacy/" target="_blank" className="text-[#2563EB] font-semibold hover:underline">razorpay.com/privacy</a>.</li>
              <li><strong>SMTP (Email):</strong> We use an email delivery service to send verification emails. Only your email address and the verification link are transmitted.</li>
            </ul>
            <p className="mt-4">
              Infrastructure services (Docker, Traefik, PostgreSQL, Redis) operate within our own servers and do not receive your personal data directly. OAuth providers only receive data as part of the standard OAuth 2.0 authorization flow initiated by you.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">6. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information in your account.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and all associated data. Upon account deletion, your projects will be stopped and all data removed within 30 days.</li>
              <li><strong>Data portability:</strong> Download your project files at any time through the dashboard file manager.</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@codehost.app" className="text-[#2563EB] font-semibold hover:underline">support@codehost.app</a>.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">7. Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review this page periodically. Continued use of CodeHost after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-100">
            <h2 className="text-xl font-black text-[#0F172A] mb-4">Contact</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, reach out to us at{' '}
              <a href="mailto:support@code-host.online" className="text-[#2563EB] font-semibold hover:underline">support@code-host.online</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-slate-100 text-slate-400 font-medium">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-slate-300">
          <p>&copy; 2026 Arsh Pathan. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="/terms" className="hover:text-slate-500">Terms</Link>
            <Link href="/privacy" className="text-slate-500">Privacy</Link>
            <Link href="/docs" className="hover:text-slate-500">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
