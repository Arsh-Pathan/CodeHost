"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { 
  ArrowLeft, 
  Home, 
  LayoutDashboard, 
  BookOpen, 
  Terminal, 
  ServerCrash,
  PlusCircle,
  Gift,
  HelpCircle,
  Sparkles,
  Database,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';

export default function NotFound() {
  const [copied, setCopied] = useState(false);

  const copyDiagnostic = () => {
    navigator.clipboard.writeText("ERROR: HTTP 404 Not Found - Zero active container proxies on edge mesh (CodeHost)");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAFCFF] text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Background Ambient Grid & Glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ 
          backgroundImage: 'radial-gradient(#2563EB 2px, transparent 2px)', 
          backgroundSize: '40px 40px' 
        }} 
      />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-blue-400/10 via-indigo-400/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Floating Subtle Tech Symbols */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden text-slate-200/60 font-mono font-bold select-none">
        <span className="absolute top-[18%] left-[8%] text-6xl opacity-30">{"{ }"}</span>
        <span className="absolute top-[28%] right-[12%] text-5xl opacity-25">{"</>"}</span>
        <span className="absolute bottom-[22%] left-[12%] text-4xl opacity-25">{"404"}</span>
        <span className="absolute bottom-[28%] right-[8%] text-7xl opacity-20">{"*"}</span>
      </div>

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <LogoWithText />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              Console
            </Link>
            <Link
              href="/docs"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              Docs
            </Link>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-xs"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12 relative z-10">
        <div className="max-w-2xl w-full text-center space-y-6 sm:space-y-8">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50/80 text-rose-700 border border-rose-200/90 rounded-full text-xs font-black uppercase tracking-wider shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>HTTP 404 &bull; Resource Not Located</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-7xl sm:text-9xl font-black text-slate-900 tracking-tighter font-mono flex items-center justify-center gap-1">
              <span>4</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 animate-pulse">
                0
              </span>
              <span>4</span>
            </h1>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Lost in the Cloud?
            </h2>
            <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
              The container, subdomain, or page you were looking for doesn&apos;t exist, has been paused, or was moved to another route.
            </p>
          </div>

          {/* Diagnostic Console Card */}
          <div className="max-w-lg mx-auto bg-[#0C101A] text-slate-200 rounded-3xl p-5 sm:p-6 text-left font-mono text-xs shadow-2xl border border-slate-800/90 relative group">
            {/* Window Controls */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-slate-400 text-[10px]">edge-routing-mesh &bull; traceroute</span>
              </div>
              <button
                onClick={copyDiagnostic}
                className="flex items-center space-x-1 text-[10px] text-slate-400 hover:text-white transition"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Diagnostic Logs */}
            <div className="space-y-1.5 text-[11px] sm:text-xs">
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-blue-400 font-bold">&gt;</span>
                <span>GET /requested-route HTTP/2.0</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-slate-600 font-bold">&gt;</span>
                <span>Host: code-host.online [Edge PoP: BOM-01]</span>
              </div>
              <div className="flex items-center space-x-2 text-rose-400 font-semibold bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                <span>&bull;</span>
                <span>Status: 404 Not Found (zero upstream proxies)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400 pt-1">
                <span className="text-emerald-400 font-bold">&gt;</span>
                <span>Recommendation: Return to dashboard or launch a new container</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-blue-600/25 active:scale-95"
            >
              <LayoutDashboard size={16} />
              <span>Go to Console</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-2xl transition shadow-xs active:scale-95"
            >
              <Home size={16} />
              <span>Homepage</span>
            </Link>

            <Link
              href="/docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-2xl transition shadow-xs active:scale-95"
            >
              <BookOpen size={16} />
              <span>Documentation</span>
            </Link>
          </div>

          {/* Quick Shortcuts Grid */}
          <div className="pt-6 sm:pt-8 border-t border-slate-200/80 text-left">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">
              Popular Quick Links
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Link
                href="/dashboard/new"
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-1.5 group-hover:text-blue-600 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PlusCircle size={15} />
                  </span>
                  <span>Deploy Project</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Launch Next.js, Python, or Docker apps</p>
              </Link>

              <Link
                href="/dashboard/referrals"
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-300 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-1.5 group-hover:text-purple-600 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Gift size={15} />
                  </span>
                  <span>Refer &amp; Earn</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Earn +100 credits per friend invited</p>
              </Link>

              <Link
                href="/status"
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-1.5 group-hover:text-emerald-600 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity size={15} />
                  </span>
                  <span>System Status</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">99.98% uptime edge network</p>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-5 text-center text-xs text-slate-400 bg-white/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} CodeHost Cloud Services. All systems operational.</p>
          <div className="flex items-center gap-4 font-medium text-slate-500 text-xs">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/docs" className="hover:text-slate-900 transition-colors">Docs</Link>
            <a href="https://discord.gg/gsh2qpEXT4" target="_blank" className="hover:text-blue-600 transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
