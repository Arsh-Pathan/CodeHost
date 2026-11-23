"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Home, 
  LayoutDashboard, 
  BookOpen, 
  Terminal, 
  PlusCircle, 
  Activity, 
  Copy, 
  Check, 
  Search, 
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Cpu,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';

export default function NotFound() {
  const [copied, setCopied] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('/requested-route');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname || '/requested-route');
    }
  }, []);

  const copyDiagnostic = () => {
    const diagnosticText = `CodeHost Edge Routing Report:
Status: 404 Not Found
Route: ${currentPath}
Edge Cluster: BOM-GLOBAL-01
Proxy: Zero active upstream container sockets
Timestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(diagnosticText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPing = () => {
    setIsPinging(true);
    setPingResult(null);
    setTimeout(() => {
      setIsPinging(false);
      setPingResult('Edge mesh reachable (14ms). Route unmapped in container ingress table.');
    }, 700);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/docs?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFCFF] text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
      {/* Background Ambient Grid & Glows */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ 
          backgroundImage: 'radial-gradient(#2563EB 2px, transparent 2px)', 
          backgroundSize: '40px 40px' 
        }} 
      />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-blue-400/5 blur-3xl pointer-events-none rounded-full" />

      {/* Main Hero & Diagnostics */}
      <main className="flex-1 flex items-center justify-center pt-28 pb-12 px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-3xl w-full text-center space-y-8">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-black uppercase tracking-wider shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <ShieldAlert size={14} className="text-rose-500" />
            <span>HTTP 404 &bull; Route Unresolved</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-8xl sm:text-9xl font-black text-slate-900 tracking-tighter font-mono flex items-center justify-center gap-1 select-none">
              <span className="text-slate-900">4</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 drop-shadow-sm">
                0
              </span>
              <span className="text-slate-900">4</span>
            </h1>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Lost in the Cloud?
            </h2>
            <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
              The container, subdomain, or page you were looking for doesn&apos;t exist, has been decommissioned, or was moved.
            </p>
          </div>

          {/* Diagnostic Console Box */}
          <div className="max-w-2xl mx-auto bg-[#0C101A] text-slate-200 rounded-3xl p-5 sm:p-6 text-left font-mono text-xs shadow-2xl border border-slate-800/90 relative group">
            {/* Window Controls */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/80 text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-slate-400 text-[11px] font-bold">codehost-routing-engine &bull; edge-tracer</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1 text-[10px] cursor-pointer"
                  title="Test Edge Ping"
                >
                  <RefreshCw size={11} className={isPinging ? "animate-spin text-blue-400" : ""} />
                  <span>{isPinging ? "Pinging..." : "Ping Edge"}</span>
                </button>
                <button
                  onClick={copyDiagnostic}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1 text-[10px] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={11} className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copy Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Diagnostic Logs */}
            <div className="space-y-2 text-[11px] sm:text-xs leading-relaxed">
              <div className="flex items-start space-x-2 text-slate-300">
                <span className="text-blue-400 font-bold select-none">&gt;</span>
                <span>GET {currentPath} HTTP/2.0</span>
              </div>
              <div className="flex items-start space-x-2 text-slate-400">
                <span className="text-slate-600 font-bold select-none">&gt;</span>
                <span>Host: code-host.online [Edge Cluster: BOM-01 &bull; Anycast]</span>
              </div>
              <div className="flex items-start space-x-2 text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20">
                <span className="text-rose-500 font-bold">&times;</span>
                <span>Status: 404 Not Found (zero active container proxies mapped)</span>
              </div>
              <div className="flex items-start space-x-2 text-slate-400">
                <span className="text-emerald-400 font-bold select-none">&gt;</span>
                <span className="text-emerald-300">Suggestion: Return to dashboard or check URL spelling</span>
              </div>

              {pingResult && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-cyan-400 flex items-center space-x-1.5 animate-fadeIn">
                  <Activity size={12} className="text-cyan-400" />
                  <span>{pingResult}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Search Jump */}
          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto relative">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search documentation or quick jump..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-24 py-3 bg-white border border-slate-200 rounded-full text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full transition cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-full transition-all shadow-xl shadow-blue-600/25 active:scale-95 cursor-pointer"
            >
              <LayoutDashboard size={16} />
              <span>Go to Console</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-full transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Home size={16} />
              <span>Homepage</span>
            </Link>

            <Link
              href="/docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-full transition shadow-xs active:scale-95 cursor-pointer"
            >
              <BookOpen size={16} />
              <span>Documentation</span>
            </Link>
          </div>

          {/* Quick Shortcuts Grid */}
          <div className="pt-8 border-t border-slate-200/80 text-left">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">
              Popular Quick Links
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Link
                href="/dashboard/new"
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-1 group-hover:text-blue-600 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PlusCircle size={15} />
                  </span>
                  <span>Deploy Project</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Launch Next.js, Python, or Docker apps</p>
              </Link>

              <Link
                href="/dashboard/billing"
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-1 group-hover:text-indigo-600 transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Cpu size={15} />
                  </span>
                  <span>Billing &amp; Usage</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">View compute and server limits</p>
              </Link>

              <a
                href="https://discord.gg/gsh2qpEXT4"
                target="_blank"
                rel="noreferrer"
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-[#5865F2] hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs mb-1 group-hover:text-[#5865F2] transition-colors">
                  <span className="w-7 h-7 rounded-lg bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center">
                    <MessageSquare size={15} />
                  </span>
                  <span>Discord Community</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Get 24/7 help from developers &amp; staff</p>
              </a>
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
            <a href="https://discord.gg/gsh2qpEXT4" target="_blank" rel="noreferrer" className="hover:text-[#5865F2] transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
