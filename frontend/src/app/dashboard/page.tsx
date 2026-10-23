"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { 
  Plus, 
  Code, 
  Globe, 
  Activity,
  Terminal, 
  Cpu, 
  Layers, 
  Server, 
  Database, 
  Box, 
  Workflow, 
  Cloud, 
  Compass, 
  Sparkles, 
  Zap, 
  Binary, 
  Bot, 
  Orbit, 
  Radio, 
  Rocket
} from 'lucide-react';

import PanelLayout from '@/components/PanelLayout';

interface IconLabItem {
  icon: any;
  bg: string;
}

const ICON_LAB: IconLabItem[] = [
  { icon: Code, bg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' },
  { icon: Terminal, bg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' },
  { icon: Cpu, bg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' },
  { icon: Layers, bg: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' },
  { icon: Server, bg: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white' },
  { icon: Database, bg: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' },
  { icon: Box, bg: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white' },
  { icon: Workflow, bg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' },
  { icon: Cloud, bg: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white' },
  { icon: Zap, bg: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white' },
  { icon: Rocket, bg: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white' },
  { icon: Bot, bg: 'bg-fuchsia-50 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white' },
  { icon: Sparkles, bg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' },
  { icon: Orbit, bg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' },
  { icon: Binary, bg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' },
  { icon: Radio, bg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' },
  { icon: Compass, bg: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' },
];

function getProjectIconConfig(key: string): IconLabItem {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ICON_LAB.length;
  return ICON_LAB[index];
}

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; username: string; role: string; serverLimit: number; emailVerified?: boolean } | null>(null);
  const [resending, setResending] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Instant cache hydration: Render dashboard in 0ms if visited before
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('codehost_user_cache');
        const cachedProjects = localStorage.getItem('codehost_projects_cache');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          setLoading(false);
        }
        if (cachedProjects) {
          setProjects(JSON.parse(cachedProjects));
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // 2. Fetch fresh user and projects in the background
    const checkAuthAndFetchProjects = async () => {
      try {
        const [meData, projData] = await Promise.all([
          fetchApi('/auth/me'),
          fetchApi('/projects')
        ]);
        
        setUser(meData.user);
        setProjects(projData.projects);

        if (typeof window !== 'undefined') {
          localStorage.setItem('codehost_user_cache', JSON.stringify(meData.user));
          localStorage.setItem('codehost_projects_cache', JSON.stringify(projData.projects));
        }
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('codehost_user_cache');
          localStorage.removeItem('codehost_projects_cache');
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchProjects();
  }, [router]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'running': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Online' };
      case 'idle': return { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', label: 'Sleeping' };
      case 'building': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Building' };
      case 'failed': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failed' };
      case 'stopped': return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Offline' };
      default: return { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', label: status };
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await fetchApi('/auth/resend-verification', { method: 'POST' });
    } catch {
      // silently fail
    } finally {
      setResending(false);
    }
  };

  const isUnverified = user && user.emailVerified === false;
  const isLimitReached = projects.length >= (user?.serverLimit || 1);

  return (
    <PanelLayout user={user} projectName={user ? `${user.username}'s Workspace` : 'Console'}>
      <div className="flex flex-col space-y-8">
        {/* Email Verification Banner */}
        {isUnverified && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg font-bold">!</div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Please verify your email</p>
                <p className="text-xs text-amber-600">Check your inbox or{' '}
                  <button onClick={handleResendVerification} disabled={resending} className="underline hover:no-underline font-medium cursor-pointer">
                    {resending ? 'sending...' : 'resend verification email'}
                  </button>. Deployments are restricted until verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section - ALWAYS rendered in initial SSR and client paint for 0ms LCP */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Apps</h1>
            <p className="text-slate-500 mt-1">Manage and monitor your online projects.</p>
          </div>

          <Link
            href="/dashboard/new"
            className={(isLimitReached || isUnverified) ? "pointer-events-none opacity-50" : ""}
          >
            <button
              type="button"
              disabled={isLimitReached || !!isUnverified}
              title={isUnverified ? 'Verify your email to create projects' : undefined}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              New Server
            </button>
          </Link>
        </div>

        {/* Dynamic Content: Skeleton state only for the async limit and project cards */}
        {loading && !user ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-24 bg-white rounded-xl border border-slate-200 shadow-sm" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="h-44 bg-white rounded-2xl border border-slate-200 shadow-sm" />
              <div className="h-44 bg-white rounded-2xl border border-slate-200 shadow-sm" />
              <div className="h-44 bg-white rounded-2xl border border-slate-200 shadow-sm" />
            </div>
          </div>
        ) : (
          <>
            {/* Limit Display */}
            <div className={`rounded-xl p-6 shadow-xl flex items-center justify-between border ${isLimitReached ? 'bg-red-600 shadow-red-500/10 border-white/10 text-white' : 'bg-white shadow-sm border-slate-200'}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLimitReached ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                   <Activity size={24} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${isLimitReached ? 'text-white' : 'text-slate-900'}`}>
                    {projects.length} / {user?.serverLimit || 1} Servers Active
                  </h3>
                  <p className={`text-sm font-medium ${isLimitReached ? 'text-red-100/80' : 'text-slate-500'}`}>
                    {isLimitReached 
                      ? "You've reached your account limit. Delete a server to deploy another, or upgrade your capacity from Time-Man." 
                      : "You have available capacity to deploy more servers."}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Grid */}
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm transition-all hover:bg-slate-50">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 rotate-12 transition-transform hover:rotate-0">
                  <Globe size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">No active apps</h3>
                <p className="text-slate-500 mt-3 max-w-sm text-center font-medium">
                  Start your journey by deploying your first project with our one-click wizard.
                </p>
                <Link href="/dashboard/new" className={`mt-8 ${isUnverified ? 'pointer-events-none opacity-50' : ''}`}>
                  <button disabled={!!isUnverified} title={isUnverified ? 'Verify your email to create projects' : undefined} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                    <Plus size={20} className="mr-2 text-white" />
                    Upload Project
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project) => {
                  const status = getStatusConfig(project.status);
                  const iconItem = getProjectIconConfig(project.name || project.id);
                  const ProjectIcon = iconItem.icon;
                  return (
                    <Link key={project.id} href={`/dashboard/project/${project.id}`} className="group block">
                      <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-xl transition-all duration-300 ${iconItem.bg}`}>
                            <ProjectIcon size={24} />
                          </div>
                          <div className={`flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${project.status === 'running' ? 'bg-emerald-500 animate-pulse' : status.color.replace('text-', 'bg-')}`} />
                            {status.label}
                          </div>
                        </div>

                        <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </h3>
                        
                        <div className="flex items-center text-sm font-medium text-slate-400 mt-2 truncate">
                          <Globe size={14} className="mr-2" />
                          {project.status === 'running' ? `${project.name.toLowerCase()}.code-host.online` : 'Provisioning...'}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                          <div className="flex flex-col space-y-1">
                             <span>CPU Usage</span>
                             <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-[12%] transition-all" />
                             </div>
                          </div>
                          <div className="flex flex-col space-y-1 items-end">
                             <span>Plan</span>
                             <span className="text-blue-600">{(project as any).tier?.toUpperCase() || 'FREE'}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  );
}
