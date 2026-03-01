"use client";

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, Box, Upload, Activity, RefreshCw, Terminal, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

import PanelLayout from '@/components/PanelLayout';

interface Project {
  id: string;
  name: string;
  status: string;
  port?: number;
  user?: { email: string; username: string };
}

interface Deployment {
  id: string;
  status: string;
  createdAt: string;
}

export default function ProjectDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<{ email: string; username: string; role: string } | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  
  const [logs, setLogs] = useState<{message: string; timestamp: string; type: string}[]>([]);

  const fetchProjectData = async () => {
    try {
      const [meRes, projRes, depRes] = await Promise.all([
        fetchApi('/auth/me'),
        fetchApi(`/projects/${params.id}`),
        fetchApi(`/deployments/${params.id}`)
      ]);
      
      setUser(meRes.user);
      setProject(projRes.project);
      setDeployments(depRes.deployments);
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
    const interval = setInterval(fetchProjectData, 3000);
    return () => clearInterval(interval);
  }, [params.id, router]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
    socket.emit('join-project-logs', params.id);
    socket.on('log', (log: {message: string; timestamp: string; type: string}) => {
      setLogs((prev) => [...prev, log].slice(-200)); // Keep last 200 logs
    });
    return () => { socket.disconnect(); };
  }, [params.id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a .zip file.');
      return;
    }

    setUploading(true);
    setError('');
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('code', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          fetchProjectData();
          setUploadProgress(0);
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            setError(res.error || 'Upload failed');
          } catch {
            setError('Upload failed');
          }
          setUploading(false);
          setUploadProgress(0);
        }
      });
      xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/deployments/${params.id}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setUploading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'running': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Online' };
      case 'idle': return { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', label: 'Sleeping' };
      case 'building': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Building' };
      case 'failed': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failed' };
      default: return { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', label: status };
    }
  };

  if (loading && !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa] space-y-4 font-sans text-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold tracking-tight animate-pulse">Connecting to project...</p>
      </div>
    );
  }

  if (!project) return null;
  const statusConfig = getStatusConfig(project.status);

  return (
    <PanelLayout user={user} projectName={project.name}>
      <div className="flex flex-col space-y-8">
        
        {/* Project Header + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
             <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                <Box size={32} />
             </div>
             <div>
               <div className="flex items-center space-x-3">
                 <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{project.name}</h1>
                 <div className={`flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${project.status === 'running' ? 'bg-emerald-500 animate-pulse' : statusConfig.color.replace('text-', 'bg-')}`} />
                    {statusConfig.label}
                 </div>
               </div>
               <p className="text-slate-500 font-medium mt-1 flex items-center">
                 <Globe size={14} className="mr-2" />
                 host.arsh-io.website/{user?.username}/{project.name.toLowerCase()}
               </p>
             </div>
          </div>

          <div className="flex items-center space-x-3">
             <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 shadow-sm">
                <RefreshCw size={16} className="mr-2 text-blue-500" />
                Restart
             </button>
             <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                Stop
             </button>
             <a 
                href={`http://host.arsh-io.website/${user?.username}/${project.name.toLowerCase()}`}
                target="_blank"
                className="flex items-center px-5 py-2.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
             >
                <ExternalLink size={16} className="mr-2" />
                Open App
             </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'CPU Usage', value: '4.2%', icon: Activity, color: 'text-blue-500' },
            { label: 'RAM Usage', value: '64 MB / 128 MB', icon: Box, color: 'text-emerald-500' },
            { label: 'Storage', value: '12 MB / 256 MB', icon: Upload, color: 'text-amber-500' },
            { label: 'Network', value: '1.2 KB/s', icon: ExternalLink, color: 'text-purple-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{stat.value}</div>
              <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${stat.color.replace('text-', 'bg-')} w-1/3 transition-all`} />
              </div>
            </div>
          ))}
        </div>

        {/* Main Panel Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Logs Terminal (Pterodactyl Style) */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-[#0d1117] rounded-2xl shadow-2xl border border-[#30363d] overflow-hidden flex flex-col flex-1 min-h-[500px]">
              <div className="px-5 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                   <Terminal className="w-5 h-5 text-slate-400" />
                   <span className="text-sm font-bold text-slate-200 uppercase tracking-widest">Console</span>
                </div>
                <div className="flex items-center space-x-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-[#30363d]" />
                   <div className="w-2.5 h-2.5 rounded-full bg-[#30363d]" />
                   <div className="w-2.5 h-2.5 rounded-full bg-[#30363d]" />
                </div>
              </div>
              <div className="p-5 flex-1 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-50">
                    <Loader2 className="animate-spin" size={20} />
                    <p className="italic">Establishing connection to application process...</p>
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex space-x-3 mb-0.5 hover:bg-white/5 px-2 py-0.5 rounded transition group">
                      <span className="text-slate-600 shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity">
                        [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]
                      </span>
                      <span className={`whitespace-pre-wrap ${
                        log.message.includes('[ERROR]') ? 'text-red-400' : 
                        log.message.includes('[notice]') ? 'text-blue-400' : 
                        'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
              {/* Command Input Area Mock */}
              <div className="px-5 py-3 bg-[#161b22] border-t border-[#30363d] flex items-center">
                 <span className="text-emerald-500 font-mono font-bold mr-3">{'>'}</span>
                 <input 
                    type="text" 
                    placeholder="Type command..." 
                    className="bg-transparent border-none outline-none text-white font-mono text-xs w-full placeholder:text-slate-600"
                    disabled
                 />
              </div>
            </div>
          </div>

          {/* Sidebar Info Panels */}
          <div className="flex flex-col space-y-8">
            
            {/* Deployment Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Deploy Code</h3>
                 <Upload size={16} className="text-blue-600" />
               </div>
               <div className="p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                      {error}
                    </div>
                  )}
                  
                  <div 
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                      uploading || project.status === 'building' 
                        ? 'border-blue-400 bg-blue-50/50' 
                        : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/30'
                    }`}
                  >
                    <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                        <h4 className="text-sm font-bold text-slate-900">Uploading... {uploadProgress}%</h4>
                        <div className="w-full mt-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : project.status === 'building' ? (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                        <h4 className="text-sm font-bold text-slate-900">Building Image</h4>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-tight">Wait for live status...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                          <Upload size={20} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Upload Project</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Select .ZIP File</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* History Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Recent Versions</h3>
                 <Activity size={16} className="text-emerald-500" />
               </div>
               <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {deployments.length === 0 ? (
                    <div className="p-8 text-center opacity-50">
                       <p className="text-xs font-bold uppercase tracking-widest">No history</p>
                    </div>
                  ) : (
                    deployments.map((dep) => (
                      <div key={dep.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition border-l-4 border-transparent hover:border-blue-500">
                         <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              #{dep.id.split('-')[0].slice(0, 6)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                              {new Date(dep.createdAt).toLocaleDateString()}
                            </span>
                         </div>
                         <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${
                           dep.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                           dep.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' : 
                           'bg-blue-50 text-blue-600 border-blue-100'
                         }`}>
                           {dep.status}
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

          </div>
        </div>

      </div>
    </PanelLayout>
  );
}
