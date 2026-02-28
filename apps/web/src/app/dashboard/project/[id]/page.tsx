"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, Box, Upload, Activity, RefreshCw, Terminal, ExternalLink } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Project {
  id: string;
  name: string;
  status: string;
  port?: number;
  user?: { email: string };
}

interface Deployment {
  id: string;
  status: string;
  createdAt: string;
}

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  
  const [logs, setLogs] = useState<{message: string; timestamp: string; type: string}[]>([]);

  const fetchProjectData = async () => {
    try {
      const projRes = await fetchApi(`/projects/${params.id}`);
      setProject(projRes.project);
      
      const depRes = await fetchApi(`/deployments/${params.id}`);
      setDeployments(depRes.deployments);
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
    // Poll for status updates every 2 seconds if something is building
    const interval = setInterval(fetchProjectData, 2000);
    return () => clearInterval(interval);
  }, [params.id, router]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
    
    socket.emit('join-project-logs', params.id);
    
    socket.on('log', (log: {message: string; timestamp: string; type: string}) => {
      setLogs((prev) => [...prev, log]);
    });

    return () => {
      socket.disconnect();
    };
  }, [params.id]);

  useEffect(() => {
    // Auto-scroll logs
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Please upload a .zip file containing your Node.js application.');
      return;
    }

    setUploading(true);
    setError('');

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('code', file);

    try {
      // We use XMLHttpRequest here to get upload progress, fetch doesn't support it directly easily yet
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percentCompleted);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Success
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

      xhr.addEventListener('error', () => {
        setError('Network error during upload');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/deployments/${params.id}`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setUploading(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading project...</p>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-4">
             <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition">
               <ArrowLeft className="h-5 w-5" />
             </Link>
             <h1 className="text-lg font-semibold text-slate-900">{project.name}</h1>
             <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
               project.status === 'running' ? 'bg-green-100 text-green-700 ring-green-600/20' : 
               project.status === 'building' ? 'bg-blue-100 text-blue-700 ring-blue-600/20' : 
               project.status === 'failed' ? 'bg-red-100 text-red-700 ring-red-600/20' : 
               'bg-slate-100 text-slate-700 ring-slate-600/20'
             }`}>
               {project.status === 'running' && <Activity className="w-3 h-3 mr-1.5 animate-pulse" />}
               {project.status === 'building' && <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />}
               {project.status.toUpperCase()}
             </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {project.status === 'running' && (
           <div className="mb-8 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 border border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">Your app is live!</h3>
                <p className="mt-1 text-sm text-emerald-700">Your application is running. Right now it's heavily isolated on a random port. Routing (Public URL) comes next in Phase 7!</p>
              </div>
               <div className="bg-white px-4 py-2 border border-emerald-200 rounded-md shadow-sm">
                <a 
                  href={`http://host.arsh-io.website/${project.user?.email.split('@')[0]}/${project.name}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center"
                >
                  host.arsh-io.website/{project.user?.email.split('@')[0]}/{project.name}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Uploader Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
               <h3 className="text-lg font-semibold text-slate-900">Deploy Code</h3>
               <p className="mt-1 text-sm text-slate-500">Upload a <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">.zip</span> of your Node.js project or Static HTML site.</p>
             </div>
             
             <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
                    {error}
                  </div>
                )}
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    uploading || project.status === 'building' ? 'border-blue-300 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="file" 
                    accept=".zip" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />

                  {(uploading || project.status === 'building') ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                      <h4 className="text-base font-semibold text-slate-900">
                        {uploading ? 'Uploading your code...' : 'Building your app...'}
                      </h4>
                      {uploading && (
                        <div className="w-full max-w-xs mt-4 bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}
                      <p className="mt-2 text-sm text-slate-500">
                        {uploading ? `${uploadProgress}% complete` : 'Please do not refresh the page.'}
                      </p>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer flex flex-col items-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 mb-1">Click to upload .zip</h4>
                      <p className="text-sm text-slate-500">Max size 50MB</p>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Deployments History Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
               <h3 className="text-lg font-semibold text-slate-900">Deployment History</h3>
             </div>
             <div className="divide-y divide-slate-100">
                {deployments.length === 0 ? (
                  <div className="p-8 text-center">
                     <p className="text-sm text-slate-500">No deployments yet.</p>
                  </div>
                ) : (
                  deployments.map((dep) => (
                    <div key={dep.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                       <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 font-mono">
                            {dep.id.split('-')[0]}
                          </span>
                          <span className="text-xs text-slate-500 mt-1">
                            {new Date(dep.createdAt).toLocaleString()}
                          </span>
                       </div>
                       <div>
                         <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                           dep.status === 'success' ? 'bg-green-100 text-green-700 ring-green-600/20' : 
                           dep.status === 'building' ? 'bg-blue-100 text-blue-700 ring-blue-600/20' : 
                           dep.status === 'failed' ? 'bg-red-100 text-red-700 ring-red-600/20' : 
                           'bg-slate-100 text-slate-700 ring-slate-600/20'
                         }`}>
                           {dep.status.toUpperCase()}
                         </span>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>

        </div>

        {/* Live Logs Terminal */}
        <div className="mt-8 bg-[#0E1117] rounded-xl shadow-lg border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-[#161B22] border-b border-slate-800 flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-200">Live Logs</h3>
          </div>
          <div className="p-4 h-96 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">Waiting for logs...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex space-x-3 mb-1 hover:bg-white/5 px-2 py-0.5 rounded transition">
                  <span className="text-slate-600 shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className={`whitespace-pre-wrap ${log.message.includes('[ERROR]') ? 'text-red-400' : 'text-slate-300'}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </main>
    </div>
  );
}
