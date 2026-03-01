"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { Plus, LogOut, Code, Globe, Activity, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'running': return 'bg-green-100 text-green-700 ring-green-600/20';
      case 'idle': return 'bg-slate-100 text-slate-700 ring-slate-600/20';
      case 'building': return 'bg-blue-100 text-blue-700 ring-blue-600/20';
      case 'failed': return 'bg-red-100 text-red-700 ring-red-600/20';
      case 'stopped': return 'bg-yellow-100 text-yellow-700 ring-yellow-600/20';
      default: return 'bg-slate-100 text-slate-700 ring-slate-600/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium tracking-tight">Waking things up...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 ml-2">CodeHost</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'ADMIN' && (
                <Link href="/admin">
                  <button className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition border border-blue-200">
                    Admin Panel
                  </button>
                </Link>
              )}
              <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{user?.email}</span>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-100 transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold leading-7 text-slate-900 tracking-tight sm:truncate">
              Your Projects
            </h2>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
             <Link
              href="/dashboard/new"
              className={projects.length >= 1 ? "pointer-events-none opacity-50" : ""}
             >
                <button
                  type="button"
                  disabled={projects.length >= 1}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition"
                >
                  <Plus className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
                  New Project
                </button>
             </Link>
          </div>
        </div>

        {projects.length >= 1 && (
           <div className="mb-6 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Free Tier Notice</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>You have reached your 1 project limit. Delete your existing project to create a new one.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center rounded-xl border border-dashed border-slate-300 p-16 bg-white shadow-sm">
            <div className="mx-auto w-16 h-16 bg-blue-50 flex items-center justify-center rounded-full mb-4">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 tracking-tight">No projects deployed yet</h3>
            <p className="mt-2 text-md text-slate-500 max-w-sm mx-auto">Get your app on the internet in seconds. No configuration required.</p>
            <div className="mt-8">
              <Link
                href="/dashboard/new"
                className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition"
              >
                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                Deploy First App
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">
                      {project.name}
                    </h3>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(project.status)}`}>
                       {project.status === 'running' && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
                       {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 flex items-center">
                    <Globe className="h-4 w-4 mr-1 text-slate-400" />
                    {project.status === 'running' ? `host.arsh-io.website/${user?.email.split('@')[0].toLowerCase() || 'user'}/${project.name.toLowerCase()}` : 'Not deployed'}
                  </p>
                  
                  <div className="mt-6">
                    <Link
                      href={`/dashboard/project/${project.id}`}
                      className="block w-full text-center rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 transition"
                    >
                      Manage App
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
