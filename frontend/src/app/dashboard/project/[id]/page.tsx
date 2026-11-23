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
  Save,
  GitBranch,
  RotateCcw,
  X,
  Check,
  Award,
  Zap,
  Sparkles
} from 'lucide-react';
import { io } from 'socket.io-client';
import PanelLayout from '@/components/PanelLayout';
import FileManager from '@/components/FileManager';
import McpSetupCard from '@/components/McpSetupCard';


function cleanLog(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Strip ANSI escape sequences and non-printable control characters & docker multiplex headers
  let clean = raw
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/[\x00-\x1f\x7f-\x9f\uFFFD]/g, '')
    .trim();

  if (!clean) return '';

  // 2. Simplify Nginx / Apache file-not-found & open() error logs
  const nginxOpenErrMatch = clean.match(
    /(?:\[error\]|\[warn\]|\[crit\])\s+\d+#\d+:\s+\*\d+\s+open\(\)\s+"([^"]+)"\s+failed\s+\(2:\s+No such file or directory\)/i
  );
  if (nginxOpenErrMatch) {
    const fullPath = nginxOpenErrMatch[1];
    const displayPath = fullPath.replace(/^\/usr\/share\/nginx\/html/, '') || fullPath;
    return `Missing file: ${displayPath}`;
  }

  const nginxErrMatch = clean.match(/(?:\[error\]|\[warn\]|\[crit\])\s+\d+#\d+:\s+\*\d+\s+"([^"]+)"\s+is not found/i);
  if (nginxErrMatch) {
    const fullPath = nginxErrMatch[1];
    const displayPath = fullPath.replace(/^\/usr\/share\/nginx\/html/, '') || fullPath;
    return `Missing file: ${displayPath}`;
  }

  // 3. Simplify other [error] log lines by stripping leading timestamps and trailing proxy metadata
  if (clean.includes('[error]')) {
    let errClean = clean.replace(/^(?:\d{4}[/-]\d{2}[/-]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s+)?/, '');
    errClean = errClean.replace(/,\s+client:.*$/, '');
    return errClean.trim();
  }

  // 4. Check for Nginx / Apache Combined or Common HTTP access log format
  const nginxAccessMatch = clean.match(/"([A-Z]+)\s+([^"\s]+)(?:\s+HTTP\/[0-9\.]+)?"\s+(\d{3})\s+(\d+|-)/);
  if (nginxAccessMatch) {
    const [, method, rawPath, status, bytes] = nginxAccessMatch;
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }
    decodedPath = decodedPath.replace(/^\/\/+/, '/');

    let sizeStr = '';
    if (bytes && bytes !== '-' && bytes !== '0') {
      const num = parseInt(bytes, 10);
      if (!isNaN(num)) {
        sizeStr = num < 1024 ? ` (${num} B)` : num < 1024 * 1024 ? ` (${(num / 1024).toFixed(1)} KB)` : ` (${(num / (1024 * 1024)).toFixed(1)} MB)`;
      }
    }

    return `${method} ${decodedPath} [${status}]${sizeStr}`;
  }

  // 5. Strip leading big Docker ISO or slashed timestamps
  clean = clean.replace(/^\d{4}[/-]\d{2}[/-]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s+/, '');

  return clean.trim();
}

function getLogColor(line: string): string {
  if (line.startsWith('Missing file:')) {
    return 'text-amber-400';
  }
  if (
    line.includes('[ERROR]') ||
    line.includes('[error]') ||
    line.includes('Error:') ||
    line.includes('[404]') ||
    line.includes('[500]') ||
    line.includes('[502]') ||
    line.includes('[503]') ||
    line.includes('[400]') ||
    line.includes('[401]') ||
    line.includes('[403]')
  ) {
    return 'text-rose-400';
  }
  if (line.includes('[301]') || line.includes('[302]') || line.includes('[304]') || line.includes('[notice]')) {
    return 'text-sky-400';
  }
  if (line.includes('[200]') || line.includes('[201]') || line.includes('[204]') || line.includes('Success!') || line.includes('> Your app is now live!')) {
    return 'text-emerald-400';
  }
  if (line.startsWith('>') || line.includes('Ready in') || line.includes('listening on')) {
    return 'text-cyan-400';
  }
  return 'text-slate-300';
}

interface Project {
  id: string;
  name: string;
  status: string;
  tier?: string;
  port?: number;
  containerId?: string;
  user?: { email: string; username: string };
  buildCommand?: string;
  startCommand?: string;
  dockerfileOverride?: string;
  envVars?: any;
  repoUrl?: string;
  repoBranch?: string;
  repoSubdir?: string;
  customDomain?: string;
}

interface TierInfo {
  id: string;
  label: string;
  memory: number;
  cpus: number;
  storage: number;
  creditsPerMonth: number;
  maxProjects: number;
  priceInr: number;
}

interface Deployment {
  id: string;
  status: string;
  source?: string;
  createdAt: string;
}

type TabType = 'console' | 'files' | 'network' | 'settings' | 'history';
type DeployMode = 'zip' | 'github' | 'mcp';

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
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // GitHub deploy state
  const [deployMode, setDeployMode] = useState<DeployMode>('zip');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubSubdir, setGithubSubdir] = useState('');
  const [githubDeploying, setGithubDeploying] = useState(false);

  const [settings, setSettings] = useState({
    buildCommand: '',
    startCommand: '',
    dockerfileOverride: '',
    envVars: {},
    customDomain: ''
  });

  const [logs, setLogs] = useState<{message: string; timestamp: string; type: string}[]>([]);
  const [stats, setStats] = useState<{cpu: number; memory: {usage: number; limit: number; percent: number}} | null>(null);

  // Tier state
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [selectedTier, setSelectedTier] = useState('');
  const [tierLoading, setTierLoading] = useState(false);

  // Subdomain change state
  const [newName, setNewName] = useState('');
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => {
      if (newName.length >= 3 && newName !== project?.name) {
        setCheckingName(true);
        fetchApi(`/projects/check-name/${newName}`)
          .then(res => setNameAvailable(res.available))
          .catch(() => setNameAvailable(false))
          .finally(() => setCheckingName(false));
      } else {
        setNameAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newName, project?.name]);

  const fetchInitialData = async () => {
    try {
      const [meRes, projRes, depRes, tierRes, logsRes] = await Promise.all([
        fetchApi('/auth/me'),
        fetchApi(`/projects/${params.id}`),
        fetchApi(`/deployments/${params.id}`),
        fetchApi('/billing/tiers'),
        fetchApi(`/projects/${params.id}/logs`).catch(() => null),
      ]);

      setUser(meRes.user);
      setProject(projRes.project);
      setDeployments(depRes.deployments);
      setTiers(tierRes.tiers);
      if (!selectedTier) setSelectedTier(projRes.project.tier || 'free');

      if (logsRes?.logs && typeof logsRes.logs === 'string' && logsRes.logs !== 'Container not running.') {
        const parsedLines = logsRes.logs
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean)
          .slice(-200)
          .map((message: string) => ({
            message: cleanLog(message),
            timestamp: new Date().toISOString(),
            type: 'run',
          })).filter((l: any) => Boolean(l.message));
        if (parsedLines.length > 0) {
          setLogs((prev) => (prev.length === 0 ? parsedLines : prev));
        }
      }

      setSettings({
        buildCommand: projRes.project.buildCommand || '',
        startCommand: projRes.project.startCommand || '',
        dockerfileOverride: projRes.project.dockerfileOverride || '',
        envVars: Object.keys(projRes.project.envVars || {}).length > 0 ? JSON.stringify(projRes.project.envVars, null, 2) : '{\n  "PORT": "3000"\n}',
        customDomain: projRes.project.customDomain || ''
      });

      // Pre-fill GitHub fields if project has repo info
      if (projRes.project.repoUrl) {
        setGithubUrl(projRes.project.repoUrl);
        setGithubBranch(projRes.project.repoBranch || 'main');
        setGithubSubdir(projRes.project.repoSubdir || '');
        setDeployMode('github');
      }
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async () => {
    // Skip polling if tab is backgrounded
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const [projRes, depRes] = await Promise.all([
        fetchApi(`/projects/${params.id}`),
        fetchApi(`/deployments/${params.id}`),
      ]);
      setProject(projRes.project);
      setDeployments(depRes.deployments);
    } catch {}
  };

  const fetchProjectData = pollStatus;

  useEffect(() => {
    fetchInitialData();
  }, [params.id, router]);

  useEffect(() => {
    const isBuilding = project?.status === 'building' || project?.status === 'queued';
    const pollInterval = isBuilding ? 3000 : 10000;
    const interval = setInterval(pollStatus, pollInterval);
    return () => clearInterval(interval);
  }, [params.id, project?.status]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const socket = io(API_URL, {
      auth: { token },
    });

    socket.on('connect', () => {
      socket.emit('join-project-logs', params.id);
    });

    socket.on('log', (log: {message: string; timestamp: string; type: string}) => {
      const cleaned = cleanLog(log.message);
      if (cleaned) {
        setLogs((prev) => [...prev, { ...log, message: cleaned }].slice(-500));
      }
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

  const handleAction = async (action: 'restart' | 'stop' | 'delete' | 'redeploy') => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    setActionLoading(action);
    setError('');

    try {
      if (action === 'delete') {
        await fetchApi(`/projects/${params.id}`, { method: 'DELETE' });
        router.push('/dashboard');
      } else {
        await fetchApi(`/projects/${params.id}/${action}`, { method: 'POST' });
        if (action === 'redeploy') {
          setActiveTab('console');
        }
        await fetchProjectData();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const parseEnvVarsInput = (raw: string): Record<string, string> | null => {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const normalized: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (k.trim()) normalized[k.trim()] = v == null ? '' : String(v);
        }
        return normalized;
      } catch {
        return null;
      }
    }
    const result: Record<string, string> = {};
    for (const line of trimmed.split(/\r?\n/)) {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) continue;
      const eqIdx = clean.indexOf('=');
      if (eqIdx <= 0) return null;
      const key = clean.slice(0, eqIdx).trim().replace(/^export\s+/, '');
      let val = clean.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!key) return null;
      result[key] = val;
    }
    return result;
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const handleSaveSettings = async () => {
    setActionLoading('save-settings');
    setError('');
    setSuccessMessage('');
    let parsedEnvVars: Record<string, string> = {};

    if (typeof settings.envVars === 'string') {
      const parsed = parseEnvVarsInput(settings.envVars);
      if (parsed === null) {
        setError('Invalid Environment Variables format. Enter valid JSON (e.g. {"PORT": "3000"}) or KEY=VALUE lines.');
        setActionLoading(null);
        return;
      }
      parsedEnvVars = parsed;
    } else if (settings.envVars && typeof settings.envVars === 'object') {
      parsedEnvVars = settings.envVars as Record<string, string>;
    }

    const finalSettings = { ...settings, envVars: parsedEnvVars };

    try {
      await fetchApi(`/projects/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(finalSettings)
      });
      await fetchProjectData();
      showSuccess('Settings saved. Redeploy or restart to apply updated environment variables.');
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
          setActiveTab('console');
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

  const handleGithubDeploy = async () => {
    if (!githubUrl) {
      setError('Please enter a GitHub repository URL.');
      return;
    }

    setGithubDeploying(true);
    setError('');

    try {
      await fetchApi(`/deployments/${params.id}/github`, {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: githubUrl,
          branch: githubBranch || 'main',
          subdir: githubSubdir || undefined,
        }),
      });
      setActiveTab('console');
      await fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGithubDeploying(false);
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
                 {project.name.toLowerCase()}.code-host.online
               </p>
             </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
             <button
                onClick={() => handleAction('redeploy')}
                disabled={actionLoading !== null || project.status === 'building'}
                className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
             >
                {actionLoading === 'redeploy' ? <Loader2 size={16} className="animate-spin mr-2" /> : <RotateCcw size={16} className="mr-2 text-purple-500" />}
                Redeploy
             </button>
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
                disabled={actionLoading !== null || project.status === 'stopped' || project.status === 'idle' || project.status === 'building'}
                className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
             >
                {actionLoading === 'stop' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Square size={16} className="mr-2 text-red-500" />}
                Stop
             </button>
             <a
                href={`https://${project.name.toLowerCase()}.code-host.online`}
                target="_blank"
                className="flex items-center px-5 py-2.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
             >
                <ExternalLink size={16} className="mr-2" />
                Open App
             </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="w-full max-w-full overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
           <div className="inline-flex items-center space-x-1.5 p-1.5 bg-slate-200/60 rounded-2xl min-w-max border border-slate-200/50">
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
                     flex items-center space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0
                     ${activeTab === tab.id
                       ? 'bg-white text-blue-600 shadow-xs'
                       : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}
                   `}
                >
                   <tab.icon size={16} />
                   <span>{tab.label}</span>
                </button>
              ))}
           </div>
        </div>

        {/* Free-Tier Hibernation Banner */}
        {(!project.tier || project.tier === 'free') && project.status === 'stopped' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Server Offline / Auto-Hibernated (Free Tier)</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Free-tier containers automatically sleep after 30 minutes of inactivity. Upgrade to Basic (50 cr/mo) for 24/7 uptime, 256MB RAM, and custom domains.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleAction('restart')}
                disabled={actionLoading !== null}
                className="px-3.5 py-2 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Wake Server
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer shadow-sm"
              >
                Upgrade to 24/7
              </button>
            </div>
          </div>
        )}

        {/* Error & Success Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center justify-between">
             <div className="flex items-center">
               <div className="w-2 h-2 rounded-full bg-red-500 mr-3 animate-pulse" />
               {error}
             </div>
             <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
               <X size={16} />
             </button>
          </div>
        )}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm font-bold flex items-center justify-between">
             <div className="flex items-center">
               <Check size={16} className="mr-3 text-emerald-600 shrink-0" />
               {successMessage}
             </div>
             <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
               <X size={16} />
             </button>
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
                    <div className="flex items-center space-x-3">
                       <button
                         onClick={() => setLogs([])}
                         className="text-[8px] font-black uppercase tracking-tighter text-slate-500 hover:text-slate-300 border border-[#30363d] px-2 py-0.5 rounded hover:border-slate-500 transition-all cursor-pointer"
                       >
                         Clear
                       </button>
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
                      logs.map((log, index) => {
                        const cleaned = cleanLog(log.message);
                        if (!cleaned) return null;
                        return (
                          <div key={index} className="flex space-x-4 mb-0.5 hover:bg-white/5 px-2 py-0.5 rounded transition group">
                            <span className="text-slate-600 shrink-0 select-none opacity-40 group-hover:opacity-100 transition-opacity">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                            </span>
                            <span className={`whitespace-pre-wrap break-all ${getLogColor(cleaned)}`}>
                              {cleaned}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Side Panels */}
              <div className="flex flex-col space-y-6">
                {/* Deploy Panel */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Deploy</h3>
                    <Upload size={18} className="text-blue-600" />
                  </div>

                  {/* Deploy Mode Toggle */}
                  <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl mb-4">
                    <button
                      onClick={() => setDeployMode('zip')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        deployMode === 'zip' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Upload size={12} />
                      <span>ZIP Upload</span>
                    </button>
                    <button
                      onClick={() => setDeployMode('github')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        deployMode === 'github' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <GitBranch size={12} />
                      <span>GitHub</span>
                    </button>
                    <button
                      onClick={() => setDeployMode('mcp')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        deployMode === 'mcp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>AI / MCP</span>
                    </button>
                  </div>

                  {deployMode === 'zip' ? (
                    <div
                      onClick={() => !uploading && project.status !== 'building' && fileInputRef.current?.click()}
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
                          <h4 className="text-sm font-bold text-slate-900">Uploading {uploadProgress}%</h4>
                          <div className="w-full mt-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        </div>
                      ) : project.status === 'building' ? (
                        <div className="flex flex-col items-center">
                          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                          <h4 className="text-sm font-bold text-slate-900 italic">Building...</h4>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                            <Upload size={20} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">Drop ZIP here</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Node.js / Python / Static</p>
                        </div>
                      )}
                    </div>
                  ) : deployMode === 'mcp' ? (
                    <McpSetupCard projectId={project.id} projectName={project.name} compact />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Repository URL</label>
                        <input
                          type="url"
                          placeholder="https://github.com/user/repo"
                          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Branch</label>
                          <input
                            type="text"
                            placeholder="main"
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={githubBranch}
                            onChange={(e) => setGithubBranch(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Subdirectory</label>
                          <input
                            type="text"
                            placeholder="(optional)"
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={githubSubdir}
                            onChange={(e) => setGithubSubdir(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleGithubDeploy}
                        disabled={githubDeploying || !githubUrl || project.status === 'building'}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                      >
                        {githubDeploying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <GitBranch size={14} />
                            <span>Deploy from GitHub</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Stats */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 flex flex-col space-y-5">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Resources</span>
                     <Activity size={14} className={project.status === 'running' ? 'text-emerald-500 animate-pulse' : 'text-slate-600'} />
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-bold text-slate-400 flex items-center"><Cpu size={12} className="mr-1.5" />CPU</span>
                         <span className="text-xs font-black">{stats?.cpu || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(stats?.cpu || 0, 100)}%` }} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-bold text-slate-400 flex items-center"><HardDrive size={12} className="mr-1.5" />Memory</span>
                         <span className="text-xs font-black">
                           {stats ? `${Math.round(stats.memory.usage / 1024 / 1024)}MB / ${Math.round(stats.memory.limit / 1024 / 1024)}MB` : '0MB / 128MB'}
                         </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(stats?.memory.percent || 0, 100)}%` }} />
                      </div>
                   </div>

                   <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</span>
                         <span className={`text-[10px] font-black ${project.status === 'running' ? 'text-emerald-400' : 'text-slate-400'}`}>
                           {project.status.toUpperCase()}
                         </span>
                      </div>
                      {project.port && (
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Port</span>
                           <span className="text-[10px] font-black text-slate-300">{project.port}</span>
                        </div>
                      )}
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
                    <a
                      href={`https://${project.name.toLowerCase()}.code-host.online`}
                      target="_blank"
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-all block"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Project URL</span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                           {project.name.toLowerCase()}.code-host.online
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                    </a>

                    {project.repoUrl && (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">GitHub Repository</span>
                          <span className="font-mono text-sm font-bold text-slate-900 break-all">{project.repoUrl}</span>
                          <span className="text-[10px] text-slate-400 mt-1">Branch: {project.repoBranch || 'main'}</span>
                        </div>
                        <GitBranch size={18} className="text-slate-300 shrink-0 ml-2" />
                      </div>
                    )}

                    {project.customDomain ? (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Custom Domain</span>
                          <a href={`https://${project.customDomain}`} target="_blank" className="font-mono text-sm font-bold text-slate-900 block hover:underline">
                            {project.customDomain}
                          </a>
                        </div>
                        <Globe size={18} className="text-slate-300 group-hover:text-blue-500 transform transition-all" />
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between opacity-50">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Custom Domain</span>
                          <span className="font-mono text-sm font-bold text-slate-900">Premium Upgrade Required</span>
                        </div>
                        <Settings size={18} className="text-slate-300" />
                      </div>
                    )}
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
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                       <span className="text-xs font-bold text-slate-500">Gateway Port</span>
                       <span className="font-mono text-xs font-black text-blue-600">{project.port || 'Auto'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                       <span className="text-xs font-bold text-slate-500">Container ID</span>
                       <span className="font-mono text-xs font-black text-slate-400 truncate max-w-[150px]">{project.containerId || 'N/A'}</span>
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
                          dep.status === 'failed' ? 'bg-red-50 text-red-600' :
                          dep.status === 'building' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                        }`}>
                           {dep.source === 'github' ? <GitBranch size={20} /> : <History size={20} />}
                        </div>
                        <div>
                           <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-slate-900">Build #{dep.id.slice(0, 8)}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                                dep.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                dep.status === 'failed' ? 'bg-red-100 text-red-700' :
                                dep.status === 'building' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                              }`}>{dep.status}</span>
                              {dep.source && dep.source !== 'zip' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest">
                                  {dep.source}
                                </span>
                              )}
                           </div>
                           <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center">
                              <Clock size={12} className="mr-1.5" />
                              {new Date(dep.createdAt).toLocaleString()}
                           </p>
                        </div>
                     </div>
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
              {/* Subdomain Change */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center">
                  <Globe size={18} className="mr-3 text-blue-600" />
                  Subdomain Settings
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Project Subdomain</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1 group">
                        <input
                          type="text"
                          placeholder={project.name}
                          className={`w-full p-4 bg-slate-50 rounded-2xl border-2 transition-all font-bold text-slate-900 focus:outline-none focus:ring-0 ${
                            nameAvailable === true ? 'border-emerald-500 bg-emerald-50/10' :
                            nameAvailable === false ? 'border-red-500 bg-red-50/10' :
                            'border-slate-100 focus:border-blue-600'
                          }`}
                          value={newName}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setNewName(val);
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                          {checkingName && <Loader2 size={16} className="animate-spin text-blue-600" />}
                          {nameAvailable === true && <Check size={16} className="text-emerald-500" />}
                          {nameAvailable === false && <X size={16} className="text-red-500" />}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!nameAvailable) return;
                          setActionLoading('rename');
                          try {
                            const result = await fetchApi(`/projects/${params.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ name: newName })
                            });
                            await fetchProjectData();
                            setNewName('');
                            setNameAvailable(null);
                            if (result.restarting) {
                              setError('');
                            } else {
                              setError('');
                            }
                          } catch (err: any) {
                            setError(err.message);
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={!nameAvailable || actionLoading !== null}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center space-x-2"
                      >
                        {actionLoading === 'rename' ? <Loader2 size={16} className="animate-spin" /> : <Save size={14} />}
                        <span>Change Subdomain</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium px-1">
                      Current: <span className="text-slate-900 font-black">{project.name}.code-host.online</span>.
                      If the app is running, it will be <span className="text-blue-600 font-black">automatically restarted</span> on the new subdomain.
                    </p>
                  </div>
                  
                  <div className="space-y-2 mt-8 pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Domain</label>
                      {(!project.tier || project.tier === 'free') && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Paid Plan Required (Basic+)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                      <input
                        type="text"
                        placeholder={(!project.tier || project.tier === 'free') ? 'Upgrade to Basic, Pro, or Business to attach a custom domain' : 'e.g., app.mywebsite.com'}
                        disabled={!project.tier || project.tier === 'free'}
                        className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-0 focus:border-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        value={settings.customDomain}
                        onChange={(e) => setSettings({ ...settings, customDomain: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '') })}
                      />
                      <button
                        onClick={handleSaveSettings}
                        disabled={actionLoading !== null || !project.tier || project.tier === 'free'}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {actionLoading === 'save-settings' ? <Loader2 size={16} className="animate-spin" /> : <Globe size={14} />}
                        <span>Save Domain</span>
                      </button>
                    </div>
                    <div className="px-1 mt-2 space-y-1">
                      {(!project.tier || project.tier === 'free') ? (
                        <p className="text-[11px] text-amber-700 font-medium">
                          Custom domains are available on Basic, Pro, and Business tiers. Upgrade your Resource Tier below to attach your own domain with automated Let&apos;s Encrypt SSL.
                        </p>
                      ) : (
                        <>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Point your domain to the VPS IP using an <span className="text-slate-900 font-black">A Record</span> to enable this custom domain.
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            A free Let&apos;s Encrypt SSL certificate will automatically be generated for your custom domain by the proxy.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource Tier */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center">
                  <Cpu size={18} className="mr-3 text-purple-600" />
                  Resource Tier
                </h3>
                <p className="text-xs text-slate-500 mb-6">Current: <span className="font-black text-slate-900">{tiers.find(t => t.id === project.tier)?.label || 'Free'}</span></p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {tiers.map((t) => {
                    const isCurrent = t.id === project.tier;
                    const isSelected = t.id === selectedTier;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTier(t.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black text-slate-900">{t.label}</span>
                          {isCurrent && <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Current</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {(t.memory / (1024 * 1024)).toFixed(0)}MB RAM · {t.cpus} {t.cpus === 1 ? 'core' : 'cores'}
                        </p>
                        {t.creditsPerMonth > 0 && (
                          <p className="text-[10px] text-slate-400 mt-1">{t.creditsPerMonth} credits/mo</p>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedTier !== project.tier && (
                  <button
                    onClick={async () => {
                      setTierLoading(true);
                      setError('');
                      try {
                        await fetchApi(`/projects/${params.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ tier: selectedTier }),
                        });
                        await fetchProjectData();
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setTierLoading(false);
                      }
                    }}
                    disabled={tierLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center space-x-2"
                  >
                    {tierLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Apply Tier Change</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                    <Terminal size={18} className="mr-3 text-slate-900" />
                    Environment Variables
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const raw = typeof settings.envVars === 'string' ? settings.envVars : JSON.stringify(settings.envVars, null, 2);
                        const parsed = parseEnvVarsInput(raw);
                        if (parsed === null) {
                          setError('Could not format: enter valid JSON or KEY=VALUE lines.');
                          return;
                        }
                        setError('');
                        setSettings({ ...settings, envVars: JSON.stringify(parsed, null, 2) });
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Format .env / JSON
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      disabled={actionLoading === 'save-settings'}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      {actionLoading === 'save-settings' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Save Variables</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Paste standard <span className="font-mono font-bold text-slate-700">.env</span> (<span className="font-mono">KEY=VALUE</span>) lines or a JSON object. Values are securely injected at runtime; redeploy or restart to apply changes.
                </p>
                <div className="relative">
                  <textarea
                    value={typeof settings.envVars === 'string' ? settings.envVars : JSON.stringify(settings.envVars, null, 2)}
                    onChange={(e) => setSettings({ ...settings, envVars: e.target.value })}
                    className="w-full h-48 p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y border border-slate-800"
                    spellCheck={false}
                  />
                </div>
              </div>

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
                    Endpoints &amp; MCP Integration
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Live HTTPS Endpoint</span>
                       <p className="text-xs font-mono font-bold text-slate-900 mb-1 break-all">https://{project.name.toLowerCase()}.code-host.online</p>
                       <p className="text-[10px] text-slate-400">Automated Let&apos;s Encrypt TLS termination.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">AI Agent MCP Endpoint</span>
                       <p className="text-xs font-mono font-bold text-slate-900 mb-1 break-all">https://api.code-host.online/mcp</p>
                       <p className="text-[10px] text-slate-400">Deploy files or inspect logs directly from Claude, Cursor, or Windsurf.</p>
                    </div>
                 </div>
              </div>

              <McpSetupCard projectId={project.id} projectName={project.name} />

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

                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Build Command</label>
                      <input
                         type="text"
                         placeholder="npm install"
                         className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                         value={settings.buildCommand}
                         onChange={(e) => setSettings({ ...settings, buildCommand: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-400 italic px-1">Defaults to &apos;npm install&apos; or &apos;pip install&apos; based on detection.</p>
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
                      <p className="text-[10px] text-slate-400 italic px-1">Command to launch your app. Must listen on PORT.</p>
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
                               setSettings({ ...settings, envVars: val });
                             }
                           } catch(e) {}
                         }}
                         onBlur={() => {
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
                      className="px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-500 transition-all hover:-translate-y-1 flex items-center justify-center space-x-2 shrink-0"
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
