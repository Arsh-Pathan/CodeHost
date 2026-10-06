'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { AlertOctagon, RotateCcw, Home, LayoutDashboard } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error internally without exposing to user UI
    console.error('Unhandled platform error:', error?.message);
  }, [error]);

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

      {/* Main Error Hero */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-xl w-full text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold tracking-wide">
            <AlertOctagon size={15} className="text-red-500" />
            <span>HTTP 500 • Platform Runtime Error</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              An unexpected application error occurred while processing this request. The system has safely contained the issue.
            </p>
          </div>

          {/* Terminal / Reference card */}
          <div className="max-w-md mx-auto bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-slate-400">codehost-incident-containment</span>
            </div>
            <p className="text-slate-400">&gt; Status: 500 Internal Error</p>
            {error.digest && (
              <p className="text-amber-400 font-mono">&gt; Reference Code: {error.digest}</p>
            )}
            <p className="text-slate-400">&gt; Action: Click &quot;Try Again&quot; or return to the platform console</p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-98"
            >
              <RotateCcw size={16} />
              <span>Try Again</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <LayoutDashboard size={16} />
              <span>Go to Console</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Home size={16} />
              <span>Homepage</span>
            </Link>
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
