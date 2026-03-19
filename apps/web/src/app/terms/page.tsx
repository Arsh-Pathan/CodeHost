import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — CodeHost',
  description: 'CodeHost Terms of Service and acceptable use policy.',
};

export default function TermsPage() {
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

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4">Terms of Service</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-16">Last updated: March 19, 2026</p>

        <div className="space-y-12 text-slate-600 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">1. Introduction</h2>
            <p>
              Welcome to CodeHost, a cloud hosting platform operated by Arsh Pathan. By creating an account or using any part of the CodeHost platform — including the dashboard, deployment tools, APIs, and hosted subdomains — you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, do not use the platform.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">2. User Responsibilities</h2>
            <p className="mb-4">By using CodeHost, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate information when creating your account, whether registering with email/password or via a third-party provider (Google, GitHub).</li>
              <li>Keep your login credentials secure and confidential. If you use social login (OAuth), you are responsible for the security of your linked third-party account.</li>
              <li>Verify your email address when registering with email and password. Unverified accounts have restricted access to deployment features.</li>
              <li>Be solely responsible for all activity under your account, including deployed projects.</li>
              <li>Not share your account or grant access to unauthorized individuals.</li>
              <li>Comply with all applicable local, national, and international laws.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">3. Third-Party Authentication</h2>
            <p className="mb-4">
              CodeHost allows you to sign in using third-party providers, including Google and GitHub (&ldquo;OAuth Providers&rdquo;). By using these sign-in methods, you agree to the following:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use of OAuth Providers is also subject to their respective terms of service and privacy policies.</li>
              <li>CodeHost receives limited profile information (name, email, provider user ID) from the OAuth Provider during sign-in. We do not access your password or store OAuth access tokens beyond the initial authentication.</li>
              <li>If an existing CodeHost account shares the same email as your OAuth provider account, the accounts will be automatically linked. This means you will be able to access the same CodeHost account using either sign-in method.</li>
              <li>CodeHost is not responsible for the availability, security, or policies of third-party OAuth Providers. If a provider experiences downtime, you may still sign in using your email and password if one has been set.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You may not use CodeHost to host, deploy, or distribute:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Malware, viruses, phishing pages, or any malicious software.</li>
              <li>Content that violates intellectual property rights or copyright law.</li>
              <li>Illegal content of any kind, including but not limited to pirated software, unlicensed media, or contraband-related material.</li>
              <li>Cryptocurrency miners, botnets, or any resource-abusive workloads.</li>
              <li>Proxy servers, VPNs, or traffic tunneling services designed to bypass network restrictions.</li>
              <li>Any content or service that could harm, disrupt, or overload CodeHost infrastructure.</li>
            </ul>
            <p className="mt-4">
              CodeHost reserves the right to suspend or terminate any project or account that violates these policies, with or without prior notice.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">5. Service Availability</h2>
            <p>
              CodeHost is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We do not guarantee uninterrupted or error-free service. Downtime may occur due to maintenance, infrastructure updates, or unforeseen technical issues. We make no uptime guarantees or service level agreements (SLAs) for free-tier users. While we strive to keep your projects running smoothly, CodeHost is not intended for mission-critical or production-grade workloads.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">6. Account Suspension & Termination</h2>
            <p className="mb-4">We may suspend or permanently terminate your account if you:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate these Terms of Service or the Acceptable Use policy.</li>
              <li>Attempt to exploit, attack, or reverse-engineer the platform.</li>
              <li>Use excessive resources that degrade service for other users.</li>
              <li>Create multiple accounts to circumvent platform limits.</li>
            </ul>
            <p className="mt-4">
              Upon termination, all your deployed projects will be stopped and your data will be deleted within 30 days. You will be notified via email before any permanent action is taken, except in cases of severe policy violations.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, CodeHost and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including but not limited to loss of data, revenue, or profits — arising from your use of the platform. Our total liability for any claim shall not exceed the amount you have paid to CodeHost in the 12 months preceding the claim. This limitation applies whether the claim is based on warranty, contract, tort, or any other legal theory.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-black text-[#0F172A] mb-4">8. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the platform after changes are posted constitutes your acceptance of the revised terms. For significant changes, we may notify you via email or a banner on the dashboard.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-100">
            <h2 className="text-xl font-black text-[#0F172A] mb-4">Contact</h2>
            <p>
              If you have any questions about these Terms, reach out to us at{' '}
              <a href="mailto:support@codehost.app" className="text-[#2563EB] font-semibold hover:underline">support@codehost.app</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-slate-100 text-slate-400 font-medium">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-slate-300">
          <p>&copy; 2026 Arsh Pathan. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="/terms" className="text-slate-500">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-500">Privacy</Link>
            <Link href="/docs" className="hover:text-slate-500">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
