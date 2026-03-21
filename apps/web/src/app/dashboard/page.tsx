"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { Plus, LogOut, Code, Globe, Activity, Loader2 } from 'lucide-react';

import PanelLayout from '@/components/PanelLayout';

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; username: string; role: string; emailVerified?: boolean } | null>(null);
  const [resending, setResending] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchProjects = async () => {
      try {
        const [meData, projData] = await Promise.all([
          fetchApi('/auth/me'),
          fetchApi('/projects')
        ]);
        
        setUser(meData.user);
        setProjects(projData.projects);
      } catch (err) {
        localStorage.removeItem('token');
        router.push('/login');
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa] space-y-4 font-sans text-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold tracking-tight animate-pulse">Initializing your dashboard...</p>
      </div>
    );
  }

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

  return (
    <PanelLayout user={user}>
      <div className="flex flex-col space-y-8">
        {/* Email Verification Banner */}
        {isUnverified && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg font-bold">!</div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Please verify your email</p>
                <p className="text-xs text-amber-600">Check your inbox or{' '}
                  <button onClick={handleResendVerification} disabled={resending} className="underline hover:no-underline font-medium">
                    {resending ? 'sending...' : 'resend verification email'}
                  </button>. Deployments are restricted until verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Apps</h1>
            <p className="text-slate-500 mt-1">Manage and monitor your online projects.</p>
          </div>

          <Link
            href="/dashboard/new"
            className={(projects.length >= 1 || isUnverified) ? "pointer-events-none opacity-50" : ""}
          >
            <button
              type="button"
              disabled={projects.length >= 1 || !!isUnverified}
              title={isUnverified ? 'Verify your email to create projects' : undefined}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all hover:-translate-y-0.5"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              New Project
            </button>
          </Link>
        </div>

        {/* Limit Warning */}
        {projects.length >= 1 && (
          <div className="rounded-xl bg-blue-600 p-6 text-white shadow-xl shadow-blue-500/10 flex items-center justify-between border border-white/10">
            <div className="flex items-center space-x-4 text-white">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                 <Activity size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">One Project Limit (Free Tier)</h3>
                <p className="text-blue-100/80 text-sm font-medium">You've reached your limit. Delete your current app to deploy another one.</p>
              </div>
            </div>
          </div>
        )}

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
              <button disabled={!!isUnverified} title={isUnverified ? 'Verify your email to create projects' : undefined} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <Plus size={20} className="mr-2 text-white" />
                Upload Project
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => {
              const status = getStatusConfig(project.status);
              return (
                <Link key={project.id} href={`/dashboard/project/${project.id}`} className="group block">
                  <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <Code size={24} />
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
                      {project.status === 'running' ? `code-host.online/${user?.username}/${project.name.toLowerCase()}` : 'Provisioning...'}
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
                         <span className="text-blue-600">Free Tier</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}

