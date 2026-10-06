import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { 
  Home, 
  LayoutDashboard, 
  BookOpen, 
  ServerCrash,
  PlusCircle,
  Gift,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoWithText />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Console
            </Link>
            <Link
              href="/docs"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Docs
            </Link>
          </div>
        </div>
      </header>

      {/* Main 404 Hero Container */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold tracking-wide">
            <ServerCrash size={15} className="text-red-500" />
            <span>HTTP 404 • Resource Not Located</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-6xl sm:text-8xl font-black text-slate-900 tracking-tight font-mono">
              4<span className="text-[#2563EB]">0</span>4
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Page not found
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find the page you&apos;re looking for. It may have been moved, deleted, or the URL may be incorrect.
            </p>
          </div>

          {/* Terminal Mockup Card */}
          <div className="max-w-md mx-auto bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-slate-400">codehost-routing-engine</span>
            </div>
            <p className="text-slate-400">&gt; GET /requested-route HTTP/1.1</p>
            <p className="text-red-400 font-semibold">&gt; Status: 404 Not Found (zero matching routes)</p>
            <p className="text-slate-400">&gt; Suggestion: Return to platform homepage or check URL path</p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-98"
            >
              <LayoutDashboard size={16} />
              <span>Go to Console</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Home size={16} />
              <span>Platform Homepage</span>
            </Link>

            <Link
              href="/docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <BookOpen size={16} />
              <span>Documentation</span>
            </Link>
          </div>

          {/* Quick Shortcuts Grid */}
          <div className="pt-6 border-t border-slate-200 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
              Popular Quick Links
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/dashboard/new"
                className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition group"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1 group-hover:text-blue-600">
                  <PlusCircle size={15} className="text-blue-600" />
                  <span>Deploy Project</span>
                </div>
                <p className="text-[11px] text-slate-500">Launch a new app or container</p>
              </Link>

              <Link
                href="/dashboard/referrals"
                className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition group"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1 group-hover:text-blue-600">
                  <Gift size={15} className="text-purple-600" />
                  <span>Refer &amp; Earn</span>
                </div>
                <p className="text-[11px] text-slate-500">Earn +100 credits per friend</p>
              </Link>

              <Link
                href="/dashboard/billing"
                className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition group"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1 group-hover:text-blue-600">
                  <HelpCircle size={15} className="text-amber-600" />
                  <span>Billing &amp; Usage</span>
                </div>
                <p className="text-[11px] text-slate-500">View compute and server limits</p>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Code Host. All rights reserved.</p>
          <div className="flex items-center gap-4 font-medium text-slate-500">
            <Link href="/terms" className="hover:text-slate-800">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-800">Privacy</Link>
            <Link href="/docs" className="hover:text-slate-800">Documentation</Link>
            <a href="mailto:support@code-host.online" className="hover:text-slate-800">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
