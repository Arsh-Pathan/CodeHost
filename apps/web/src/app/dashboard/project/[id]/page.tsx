"use client";

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, API_URL } from '@/lib/api';
import { 
  ArrowLeft, 
  Box, 
  Upload, 
  Activity, 
  RefreshCw, 
  Terminal, 
  ExternalLink, 
  Globe, 
  Loader2, 
  FileCode, 
  Network, 
  Settings, 
  Trash2, 
  Play, 
  Square,
  ChevronRight,
  HardDrive,
  Cpu,
  Clock,
  History,
  Save
} from 'lucide-react';
import { io } from 'socket.io-client';
import PanelLayout from '@/components/PanelLayout';
import FileManager from '@/components/FileManager';

interface Project {
  id: string;
  name: string;
  status: string;
  port?: number;
  user?: { email: string; username: string };
  buildCommand?: string;
  startCommand?: string;
  dockerfileOverride?: string;
  envVars?: any;
}

interface Deployment {
  id: string;
  status: string;
  createdAt: string;
}

type TabType = 'console' | 'files' | 'network' | 'settings' | 'history';

export default function ProjectDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<{ email: string; username: string; role: string } | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('console');
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    buildCommand: '',
    startCommand: '',
    dockerfileOverride: '',
    envVars: {}
  });
  
  const [logs, setLogs] = useState<{message: string; timestamp: string; type: string}[]>([]);
  const [stats, setStats] = useState<{cpu: number; memory: {usage: number; limit: number; percent: number}} | null>(null);

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
      
      setSettings({
        buildCommand: projRes.project.buildCommand || '',
        startCommand: projRes.project.startCommand || '',
        dockerfileOverride: projRes.project.dockerfileOverride || '',
        envVars: projRes.project.envVars || {}
      });
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
    // Robust socket connection using the same URL as API
    const socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log('Connected to socket');
      socket.emit('join-project-logs', params.id);
    });

    socket.on('log', (log: {message: string; timestamp: string; type: string}) => {
      setLogs((prev) => [...prev, log].slice(-300));
    });

    socket.on('stats', (data: any) => {
      setStats(data);
    });

    return () => { socket.disconnect(); };
  }, [params.id]);

  useEffect(() => {
    if (activeTab === 'console') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const handleAction = async (action: 'restart' | 'stop' | 'delete') => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    
    setActionLoading(action);
    setError('');
    
    try {
      if (action === 'delete') {
        await fetchApi(`/projects/${params.id}`, { method: 'DELETE' });
        router.push('/dashboard');
      } else {
        await fetchApi(`/projects/${params.id}/${action}`, { method: 'POST' });
        await fetchProjectData();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    setActionLoading('save-settings');
    setError('');
    let finalSettings = { ...settings };
    if (typeof finalSettings.envVars === 'string') {
      try {
        finalSettings.envVars = JSON.parse(finalSettings.envVars);
      } catch (e) {
        finalSettings.envVars = {};
      }
    }

    try {
      await fetchApi(`/projects/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(finalSettings)
      });
      await fetchProjectData();
      alert('Settings saved! Deploy to apply changes.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

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
          setActiveTab('console'); // Switch to console to see build
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
      xhr.open('POST', `${API_URL}/deployments/${params.id}`);
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
      case 'stopped': return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Offline' };
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
             <button 
                onClick={() => handleAction('restart')}
                disabled={actionLoading !== null || project.status === 'building'}
                className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
             >
                {actionLoading === 'restart' ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2 text-blue-500" />}
                {project.status === 'running' ? 'Restart' : 'Start'}
             </button>
             <button 
                onClick={() => handleAction('stop')}
                disabled={actionLoading !== null || project.status === 'stopped' || project.status === 'building'}
                className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
             >
                {actionLoading === 'stop' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Square size={16} className="mr-2 text-red-500" />}
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

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 p-1 bg-slate-200/50 rounded-2xl w-fit">
           {[
             { id: 'console', label: 'Console', icon: Terminal },
             { id: 'files', label: 'File Manager', icon: FileCode },
             { id: 'network', label: 'Network', icon: Network },
             { id: 'history', label: 'History', icon: History },
             { id: 'settings', label: 'Settings', icon: Settings },
           ].map((tab) => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                `}
             >
                <tab.icon size={16} />
                <span>{tab.label}</span>
             </button>
           ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center">
             <div className="w-2 h-2 rounded-full bg-red-500 mr-3 animate-pulse" />
             {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'console' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
              {/* Console */}
              <div className="lg:col-span-2 flex flex-col h-[600px]">
                <div className="bg-[#0d1117] rounded-3xl shadow-2xl border border-[#30363d] overflow-hidden flex flex-col flex-1">
                  <div className="px-6 py-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <Terminal className="w-5 h-5 text-slate-400" />
                       <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Live Terminal</span>
                    </div>
                    <div className="flex items-center space-x-2">
                       <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                          {project.status === 'running' ? 'Connected' : 'Offline'}
                       </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-700">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
                        <Terminal size={40} className="text-slate-600" />
                        <p className="italic font-medium text-center max-w-xs">Initializing console session. Logs will appear once your application is active.</p>
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="flex space-x-4 mb-0.5 hover:bg-white/5 px-2 py-0.5 rounded transition group">
                          <span className="text-slate-600 shrink-0 select-none opacity-40 group-hover:opacity-100 transition-opacity">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </span>
                          <span className={`whitespace-pre-wrap ${
                            log.message.includes('[ERROR]') ? 'text-red-400' : 
                            log.message.includes('[notice]') ? 'text-blue-400' : 
                            log.message.includes('Success!') ? 'text-emerald-400' :
                            'text-slate-300'
                          }`}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Side Panels */}
              <div className="flex flex-col space-y-6">
                {/* Deployment Panel */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Uploader</h3>
                    <Upload size={18} className="text-blue-600" />
                  </div>
                  
                  <div 
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      uploading || project.status === 'building' 
                        ? 'border-blue-400 bg-blue-50/50' 
                        : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/30'
                    }`}
                  >
                    <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                        <h4 className="text-sm font-bold text-slate-900">Uploading {uploadProgress}%</h4>
                        <div className="w-full mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : project.status === 'building' ? (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                        <h4 className="text-sm font-bold text-slate-900 italic">Synthesizing App...</h4>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Deploy Zip</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Node.js / Static Site</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Stats */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/10 flex flex-col space-y-6">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Resources</span>
                     <Activity size={14} className={project.status === 'running' ? 'text-emerald-500 animate-pulse' : 'text-slate-600'} />
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-bold text-slate-400">CPU Usage</span>
                         <span className="text-xs font-black">{stats?.cpu || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats?.cpu || 0}%` }} />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-bold text-slate-400">Memory (RAM)</span>
                         <span className="text-xs font-black">
                           {stats ? `${Math.round(stats.memory.usage / 1024 / 1024)}MB / ${Math.round(stats.memory.limit / 1024 / 1024)}MB` : '0MB / 128MB'}
                         </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats?.memory.percent || 0}%` }} />
                      </div>
                   </div>
                   
                   <div className="pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Node Engine</span>
                         <span className="text-[10px] font-black text-slate-300">v20.x LTS</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <FileManager projectId={params.id} />
          )}

          {activeTab === 'network' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center">
                    <ExternalLink size={16} className="mr-3 text-blue-600" />
                    Public Access
                  </h3>
                  <div className="space-y-6">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Subdomain URL</span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                           host.arsh-io.website/{user?.username}/{project.name.toLowerCase()}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between opacity-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Custom Domain</span>
                        <span className="font-mono text-sm font-bold text-slate-900">Premium Upgrade Required</span>
                      </div>
                      <Settings size={18} className="text-slate-300" />
                    </div>
                  </div>
               </div>

               <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center">
                    <Network size={16} className="mr-3 text-emerald-500" />
                    Technical Routing
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                       <span className="text-xs font-bold text-slate-500">Internal IP</span>
                       <span className="font-mono text-xs font-black text-slate-900">Container Mesh</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                       <span className="text-xs font-bold text-slate-500">Protocol</span>
                       <span className="font-mono text-xs font-black text-slate-900 uppercase">HTTP/1.1</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                       <span className="text-xs font-bold text-slate-500">Gateway Port</span>
                       <span className="font-mono text-xs font-black text-blue-600">{project.port || 'Auto'}</span>
                    </div>
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Deployment History</h3>
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {deployments.length} Builds
                  </span>
               </div>
               <div className="divide-y divide-slate-100">
                 {deployments.map((dep) => (
                   <div key={dep.id} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                     <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          dep.status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                          dep.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                           <History size={20} />
                        </div>
                        <div>
                           <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-slate-900">Build #{dep.id.slice(0, 8)}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                                dep.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                dep.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>{dep.status}</span>
                           </div>
                           <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center">
                              <Clock size={12} className="mr-1.5" />
                              {new Date(dep.createdAt).toLocaleString()}
                           </p>
                        </div>
                     </div>
                     <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center group">
                        Inspect Logs
                        <ChevronRight size={14} className="ml-1 transform group-hover:translate-x-1 transition-all" />
                     </button>
                   </div>
                 ))}
                 {deployments.length === 0 && (
                   <div className="p-20 text-center flex flex-col items-center">
                      <History size={40} className="text-slate-200 mb-4" />
                      <p className="text-slate-400 font-medium italic">No deployment history found.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8">
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-8">General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Project Identifier</label>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-xs font-bold text-slate-400 select-all">
                        {project.id}
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Created By</label>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[10px]">
                           {project.user?.username?.[0] || 'U'}
                        </div>
                        <span className="text-xs font-bold text-slate-900">{project.user?.username || project.user?.email}</span>
                     </div>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center">
                    <HardDrive size={16} className="mr-3 text-blue-600" />
                    Connection Details
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">SFTP Access</span>
                       <p className="text-xs font-bold text-slate-900 mb-1">sftp.codehost.app</p>
                       <p className="text-[10px] text-slate-400">Use your dashboard credentials.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">SSH Access</span>
                       <p className="text-xs font-bold text-slate-900 mb-1">Disabled on Free Tier</p>
                       <p className="text-[10px] text-slate-400 italic">Upgrade to Premium for CLI access.</p>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Custom Run Configuration</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Control how your app builds and starts.</p>
                  </div>
                  <button 
                    onClick={handleSaveSettings}
                    disabled={actionLoading !== null}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center space-x-2"
                  >
                    {actionLoading === 'save-settings' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Settings</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Build Command</label>
                         <input 
                            type="text" 
                            placeholder="npm install"
                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={settings.buildCommand}
                            onChange={(e) => setSettings({ ...settings, buildCommand: e.target.value })}
                         />
                         <p className="text-[10px] text-slate-400 italic px-1">Defaults to 'npm install' or 'pip install' based on detection.</p>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Start Command</label>
                         <input 
                            type="text" 
                            placeholder="npm start"
                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={settings.startCommand}
                            onChange={(e) => setSettings({ ...settings, startCommand: e.target.value })}
                         />
                         <p className="text-[10px] text-slate-400 italic px-1">Command to launch your app. Note: Must listen on PORT.</p>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Environment Variables (JSON)</label>
                         <textarea 
                            rows={3}
                            placeholder='{ "API_KEY": "123", "GREETING": "Hello CodeHost!" }'
                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={typeof settings.envVars === 'string' ? settings.envVars : JSON.stringify(settings.envVars, null, 2)}
                            onChange={(e) => {
                              try {
                                const val = e.target.value;
                                if (!val) setSettings({ ...settings, envVars: {} });
                                else {
                                  // We keep it as string while editing to avoid parser errors while typing
                                  setSettings({ ...settings, envVars: val });
                                }
                              } catch(e) {}
                            }}
                            onBlur={(e) => {
                              try {
                                if (typeof settings.envVars === 'string') {
                                   const parsed = JSON.parse(settings.envVars);
                                   setSettings({ ...settings, envVars: parsed });
                                }
                              } catch(e) {
                                alert('Invalid JSON in Environment Variables');
                              }
                            }}
                         />
                         <p className="text-[10px] text-slate-400 italic px-1">Format: JSON object.</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 px-1 block mb-3">Power User: Dockerfile Override</label>
                        <textarea 
                          rows={6}
                          placeholder="FROM node:18-alpine ..."
                          className="w-full p-6 bg-[#0d1117] text-slate-300 rounded-2xl border border-[#30363d] font-mono text-xs focus:outline-none scrollbar-thin scrollbar-thumb-slate-800"
                          value={settings.dockerfileOverride}
                          onChange={(e) => setSettings({ ...settings, dockerfileOverride: e.target.value })}
                        />
                        <p className="text-[10px] text-slate-500 italic px-1 mt-2">Entering anything here will bypass all automatic detections.</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-red-200 p-8 shadow-sm">
                 <h3 className="text-sm font-black uppercase tracking-widest text-red-600 mb-2">Danger Zone</h3>
                 <p className="text-xs font-medium text-slate-500 mb-8">Irreversible actions that will permanently affect your app.</p>
                 
                 <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h4 className="text-sm font-black text-red-900">Delete Project</h4>
                      <p className="text-xs font-medium text-red-700/70 mt-1">Stop the app, remove the container, and delete all deployment history.</p>
                    </div>
                    <button 
                      onClick={() => handleAction('delete')}
                      disabled={actionLoading !== null}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-500 transition-all hover:-translate-y-1 flex items-center justify-center space-x-2"
                    >
                      {actionLoading === 'delete' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      <span>Purge Server</span>
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </PanelLayout>
  );
}
