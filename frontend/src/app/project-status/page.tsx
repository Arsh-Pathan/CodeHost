'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import {
  ServerCrash,
  PowerOff,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Home,
  LayoutDashboard,
  PlusCircle,
  ExternalLink,
  ShieldAlert,
  Clock,
  Terminal,
  Layers,
  Wrench
} from 'lucide-react';

interface ProjectStatusResponse {
  exists: boolean;
  name?: string;
  status?: 'idle' | 'building' | 'running' | 'failed' | 'stopped' | 'maintenance' | string;
  tier?: string;
  customDomain?: string;
  updatedAt?: string;
  host?: string;
  subdomain?: string | null;
}

function ProjectStatusContent() {
  const searchParams = useSearchParams();
  const hostParam = searchParams.get('host') || '';
  const pathParam = searchParams.get('path') || '/';

  const [displayHost, setDisplayHost] = useState(hostParam);
  const [data, setData] = useState<ProjectStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsUntilRetry, setSecondsUntilRetry] = useState(5);

  const fetchStatus = useCallback(async (targetHost: string) => {
    if (!targetHost) {
      setLoading(false);
      return;
    }

    try {
      // Determine API endpoint: use public API URL or fallback
      let apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        if (typeof window !== 'undefined' && window.location.hostname.endsWith('code-host.online')) {
          apiUrl = 'https://api.code-host.online';
        } else {
          apiUrl = 'http://localhost:4000';
        }
      }

      const res = await fetch(`${apiUrl}/projects/public-status?host=${encodeURIComponent(targetHost)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        setData({ exists: false, host: targetHost });
      } else {
        const json: ProjectStatusResponse = await res.json();
        setData(json);

        // If the project became running while the user was on the status page,
        // redirect back to reload the target URL
        if (json.exists && json.status === 'running') {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    } catch {
      setData({ exists: false, host: targetHost });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let activeHost = hostParam;
    if (!activeHost && typeof window !== 'undefined') {
      activeHost = window.location.hostname;
    }
    setDisplayHost(activeHost);
    fetchStatus(activeHost);
  }, [hostParam, fetchStatus]);

  // Auto-polling when the project is currently building or deploying
  useEffect(() => {
    if (!data || !data.exists || data.status !== 'building') return;

    const timer = setInterval(() => {
      setSecondsUntilRetry((prev) => {
        if (prev <= 1) {
          fetchStatus(displayHost);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data, displayHost, fetchStatus]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchStatus(displayHost);
  };

  const getSubdomainSlug = () => {
    if (!displayHost) return 'project';
    const parts = displayHost.split('.');
    return parts[0] || 'project';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="https://code-host.online" className="flex items-center gap-2">
            <LogoWithText />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="https://code-host.online/dashboard"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Console
            </Link>
            <Link
              href="https://code-host.online/docs"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Documentation
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-2xl w-full text-center space-y-8">

          {/* Loading View */}
          {loading && (
            <div className="py-16 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-500">Checking server resolution and deployment status...</p>
            </div>
          )}

          {/* Unknown / Non-existent Subdomain (404) */}
          {!loading && (!data || !data.exists) && (
            <>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold tracking-wide">
                <ServerCrash size={15} className="text-red-500" />
                <span>HTTP 404 • Server Not Found</span>
              </div>

              {/* Heading */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  This server doesn&apos;t exist
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The project or server you are looking for does not exist on Code Host, or the address may be incorrect.
                </p>
              </div>

              {/* Status Inspector Card */}
              <div className="max-w-md mx-auto bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs shadow-sm border border-slate-800">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-400">codehost-edge-router</span>
                </div>
                <p className="text-slate-400">&gt; Query: {displayHost || 'unknown-host'}</p>
                <p className="text-red-400 font-semibold">&gt; Status: 404 Not Found (no registered project or container)</p>
                <p className="text-slate-400">&gt; Suggested action: Claim subdomain or verify domain routing</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="https://code-host.online/dashboard/new"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <PlusCircle size={16} />
                  <span>Deploy &apos;{getSubdomainSlug()}&apos; on Code Host</span>
                </Link>

                <Link
                  href="https://code-host.online"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Home size={16} />
                  <span>Platform Homepage</span>
                </Link>

                <Link
                  href="https://code-host.online/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <LayoutDashboard size={16} />
                  <span>Console</span>
                </Link>
              </div>
            </>
          )}

          {/* Existing Project: Offline / Stopped */}
          {!loading && data && data.exists && (data.status === 'stopped' || data.status === 'idle') && (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold tracking-wide">
                <PowerOff size={15} className="text-amber-600" />
                <span>HTTP 503 • Server Inactive</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  This server is currently offline
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The project <span className="font-semibold text-slate-800">{data.name}</span> exists on Code Host, but the application container is currently stopped.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs shadow-sm border border-slate-800">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-400">codehost-cluster-status</span>
                </div>
                <p className="text-slate-400">&gt; Target: {data.name}</p>
                <p className="text-amber-400 font-semibold">&gt; State: Stopped (Zero active container replicas)</p>
                <p className="text-slate-400">&gt; Resolution: The project owner can restart it from the console</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="https://code-host.online/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <LayoutDashboard size={16} />
                  <span>Open Console to Start Server</span>
                </Link>

                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Check Status Again</span>
                </button>

                <Link
                  href="https://code-host.online"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Home size={16} />
                  <span>Platform Homepage</span>
                </Link>
              </div>
            </>
          )}

          {/* Existing Project: Building / Deploying */}
          {!loading && data && data.exists && data.status === 'building' && (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold tracking-wide">
                <Loader2 size={15} className="text-blue-600 animate-spin" />
                <span>Deployment in Progress</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  This server is currently deploying
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The project <span className="font-semibold text-slate-800">{data.name}</span> is actively building. Changes are being deployed to the container network.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs shadow-sm border border-slate-800">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>codehost-build-engine</span>
                  </div>
                  <span className="text-blue-400">Auto-refreshing in {secondsUntilRetry}s</span>
                </div>
                <p className="text-slate-400">&gt; Building container image...</p>
                <p className="text-blue-400 font-semibold">&gt; State: Compiling dependencies and provisioning HTTPS</p>
                <p className="text-slate-400">&gt; This page will automatically reload once online</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Refresh Now</span>
                </button>

                <Link
                  href="https://code-host.online/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <LayoutDashboard size={16} />
                  <span>View Build Logs in Console</span>
                </Link>
              </div>
            </>
          )}

          {/* Existing Project: Failed */}
          {!loading && data && data.exists && data.status === 'failed' && (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold tracking-wide">
                <AlertTriangle size={15} className="text-red-500" />
                <span>HTTP 503 • Service Unavailable</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  This server encountered an error
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The project <span className="font-semibold text-slate-800">{data.name}</span> exists on Code Host, but the latest deployment failed to start or crashed.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs shadow-sm border border-slate-800">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-400">codehost-runtime-monitor</span>
                </div>
                <p className="text-slate-400">&gt; Target: {data.name}</p>
                <p className="text-red-400 font-semibold">&gt; State: Deployment Failed / Exit Status Non-Zero</p>
                <p className="text-slate-400">&gt; Resolution: Inspect error logs in Console to fix the issue</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="https://code-host.online/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <LayoutDashboard size={16} />
                  <span>Inspect Logs in Console</span>
                </Link>

                <Link
                  href="https://code-host.online"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Home size={16} />
                  <span>Platform Homepage</span>
                </Link>
              </div>
            </>
          )}

          {/* Existing Project: Maintenance */}
          {!loading && data && data.exists && data.status === 'maintenance' && (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold tracking-wide">
                <Wrench size={15} className="text-amber-600" />
                <span>HTTP 503 • Under Maintenance</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  This server is under maintenance
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The project <span className="font-semibold text-slate-800">{data.name}</span> is temporarily offline while maintenance or updates are being performed.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Check Status Again</span>
                </button>

                <Link
                  href="https://code-host.online"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Home size={16} />
                  <span>Platform Homepage</span>
                </Link>
              </div>
            </>
          )}

          {/* Existing Project: Running (Proxy catch-up) */}
          {!loading && data && data.exists && data.status === 'running' && (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold tracking-wide">
                <Loader2 size={15} className="text-emerald-600 animate-spin" />
                <span>Establishing Proxy Connection</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Connecting to application...
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                  The server is active. The network proxy is establishing direct connection to the container.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Connect to Server</span>
                </button>
              </div>
            </>
          )}

          {/* Platform Discovery Promo Card */}
          <div className="pt-8 border-t border-slate-200 text-left">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-blue-900 tracking-wide uppercase">
                  Powered by Code Host Cloud
                </p>
                <p className="text-xs text-slate-600">
                  Deploy Next.js, Python, Go, Node.js, and 20+ stacks with zero configuration, auto-HTTPS, and free tier.
                </p>
              </div>
              <Link
                href="https://code-host.online"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <span>Deploy Free</span>
                <ExternalLink size={13} />
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
            <Link href="https://code-host.online/terms" className="hover:text-slate-800">Terms</Link>
            <Link href="https://code-host.online/privacy" className="hover:text-slate-800">Privacy</Link>
            <Link href="https://code-host.online/docs" className="hover:text-slate-800">Documentation</Link>
            <a href="mailto:support@code-host.online" className="hover:text-slate-800">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ProjectStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ProjectStatusContent />
    </Suspense>
  );
}
