"use client";

import { useEffect, useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import UserAvatar from '@/components/UserAvatar';
import {
  Users,
  Layout,
  Activity,
  Database,
  ArrowLeft,
  ShieldAlert,
  Trash2,
  Power,
  Shield,
  UserX,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  Cpu,
  HardDrive,
  Globe,
  Bell,
  Server,
  Box,
  Check,
  X,
  DollarSign,
  TrendingUp,
  CreditCard,
  Layers,
  Play,
  RotateCw,
  Sliders,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Clock,
  Zap,
  Radio,
  Lock,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Type definitions
interface SystemMetrics {
  cpu: {
    percent: number;
    cores: number;
    model: string;
    loadAvg: number[];
  };
  memory: {
    percent: number;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    totalGb: string;
    usedGb: string;
    freeGb: string;
  };
  disk: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    percent: number;
    totalGb: string;
    freeGb: string;
    usedGb: string;
  };
  docker: {
    containersTotal: number;
    containersRunning: number;
    containersStopped: number;
    imagesTotal: number;
    serverVersion: string;
    memTotalGb: string;
  };
  host: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    uptimeSeconds: number;
    nodeVersion: string;
  };
  history: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    disk: number;
  }>;
}

interface RevenueAnalytics {
  summary: {
    totalRevenueInr: number;
    totalRevenueCredits: number;
    estimatedMrr: number;
    arpu: number;
    paidUsers: number;
    totalUsers: number;
    conversionRate: number;
    totalWalletFloatInr: number;
    totalWalletFloatCredits: number;
  };
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  tierBreakdown: Record<string, { users: number; projects: number; revenueInr: number }>;
  recentTransactions: any[];
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  tier?: string;
  tierExpiresAt?: string | null;
  serverLimit: number;
  emailVerified: boolean;
  provider: string | null;
  createdAt: string;
  wallet: { balance: number } | null;
  _count: { projects: number };
}

interface AdminProject {
  id: string;
  name: string;
  framework: string;
  status: string;
  port: number;
  customDomain: string | null;
  tier: string;
  createdAt: string;
  user: {
    email: string;
    username: string;
  };
  _count: {
    deployments: number;
  };
}

interface TransactionItem {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  createdAt: string;
  wallet?: {
    user?: {
      id: string;
      email: string;
      username: string;
      tier?: string;
    };
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'fleet' | 'revenue' | 'users' | 'host'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fleet filters & modal
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectTierFilter, setProjectTierFilter] = useState('all');
  
  // Log viewer modal
  const [logModalProject, setLogModalProject] = useState<AdminProject | null>(null);
  const [projectLogs, setProjectLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [logTail, setLogTail] = useState<number>(100);

  // User management modals
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userTierFilter, setUserTierFilter] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', serverLimit: 1, role: 'USER' });

  // Tier modal
  const [tierModalUser, setTierModalUser] = useState<AdminUser | null>(null);
  const [selectedUserTier, setSelectedUserTier] = useState('free');
  const [tierDurationDays, setTierDurationDays] = useState(30);

  // Credit adjustment modal
  const [creditModalUser, setCreditModalUser] = useState<AdminUser | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [creditReason, setCreditReason] = useState<string>('Admin bonus');

  // Transactions ledger state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(false);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show temporary toast
  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Main data fetch
  const fetchAllData = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const [statsRes, healthRes, projectsRes, usersRes, metricsRes, revenueRes] = await Promise.all([
        fetchApi('/admin/stats').catch(() => null),
        fetchApi('/admin/health').catch(() => null),
        fetchApi('/admin/projects').catch(() => ({ projects: [] })),
        fetchApi('/admin/users').catch(() => ({ users: [] })),
        fetchApi('/admin/system/metrics').catch(() => null),
        fetchApi('/admin/revenue/analytics').catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      if (healthRes?.health) setHealth(healthRes.health);
      if (projectsRes?.projects) setProjects(projectsRes.projects);
      if (usersRes?.users) setUsers(usersRes.users);
      if (metricsRes) setSystemMetrics(metricsRes);
      if (revenueRes) setRevenueData(revenueRes);
    } catch (err: any) {
      if (err.status === 403 || err.status === 401) {
        router.push('/dashboard');
      } else if (!isBackground) {
        showToast('error', 'Failed to refresh admin data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch transactions ledger
  const fetchTransactions = async (page = 1) => {
    setTxLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', '15');
      if (txSearch) query.set('search', txSearch);
      if (txTypeFilter) query.set('type', txTypeFilter);

      const res = await fetchApi(`/admin/revenue/transactions?${query.toString()}`);
      if (res?.transactions) {
        setTransactions(res.transactions);
        setTxPage(res.pagination?.page || 1);
        setTxTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (e: any) {
      showToast('error', 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-refresh interval (10s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAllData(true);
      if (activeTab === 'revenue') {
        fetchTransactions(txPage);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, txPage]);

  // Load transactions when revenue tab opens
  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchTransactions(1);
    }
  }, [activeTab, txTypeFilter]);

  // Open Log Viewer
  const handleOpenLogs = async (project: AdminProject) => {
    setLogModalProject(project);
    setLogsLoading(true);
    setProjectLogs('');
    try {
      const data = await fetchApi(`/admin/projects/${project.id}/logs?tail=${logTail}`);
      setProjectLogs(data.logs || 'No log output captured.');
    } catch (err: any) {
      setProjectLogs(`Failed to fetch container logs: ${err.message || 'Unknown error'}`);
    } finally {
      setLogsLoading(false);
    }
  };

  // Refresh logs in modal
  const handleRefreshLogs = async () => {
    if (!logModalProject) return;
    setLogsLoading(true);
    try {
      const data = await fetchApi(`/admin/projects/${logModalProject.id}/logs?tail=${logTail}`);
      setProjectLogs(data.logs || 'No log output captured.');
    } catch (err: any) {
      setProjectLogs(`Error: ${err.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  // Project Actions
  const handleRestartProject = async (id: string, name: string) => {
    setActionLoading(`restart-${id}`);
    try {
      await fetchApi(`/admin/projects/${id}/restart`, { method: 'POST' });
      showToast('success', `Restarted container for ${name}`);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to restart container');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartProject = async (id: string, name: string) => {
    setActionLoading(`start-${id}`);
    try {
      await fetchApi(`/admin/projects/${id}/start`, { method: 'POST' });
      showToast('success', `Started container for ${name}`);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to start container');
    } finally {
      setActionLoading(null);
    }
  };

  const handleKillProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to kill container ${name}?`)) return;
    setActionLoading(`kill-${id}`);
    try {
      await fetchApi(`/admin/projects/${id}/kill`, { method: 'POST' });
      showToast('success', `Stopped container for ${name}`);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to stop container');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`DANGER: Permanently delete project "${name}" and all associated files/deployments?`)) return;
    setActionLoading(`delete-proj-${id}`);
    try {
      await fetchApi(`/admin/projects/${id}`, { method: 'DELETE' });
      showToast('success', `Project ${name} deleted`);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete project');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateProjectTier = async (id: string, tier: string) => {
    setActionLoading(`tier-${id}`);
    try {
      await fetchApi(`/admin/projects/${id}/tier`, {
        method: 'PUT',
        body: JSON.stringify({ tier }),
      });
      showToast('success', `Project tier updated to ${tier.toUpperCase()}`);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to update project tier');
    } finally {
      setActionLoading(null);
    }
  };

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create-user');
    try {
      await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      showToast('success', `User ${newUser.email} created successfully`);
      setShowAddUserModal(false);
      setNewUser({ email: '', username: '', password: '', serverLimit: 1, role: 'USER' });
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to create user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`DANGER: Are you sure you want to delete user "${email}"? This will permanently remove all their projects and data.`)) return;
    setActionLoading(`delete-user-${id}`);
    try {
      await fetchApi(`/admin/users/${id}`, { method: 'DELETE' });
      showToast('success', `User ${email} removed`);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveUserTier = async () => {
    if (!tierModalUser) return;
    setActionLoading('save-tier');
    try {
      await fetchApi(`/admin/users/${tierModalUser.id}/tier`, {
        method: 'PUT',
        body: JSON.stringify({ tier: selectedUserTier, durationDays: tierDurationDays }),
      });
      showToast('success', `Updated ${tierModalUser.email} tier to ${selectedUserTier.toUpperCase()}`);
      setTierModalUser(null);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to update tier');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantCredits = async () => {
    if (!creditModalUser) return;
    setActionLoading('grant-credits');
    try {
      await fetchApi(`/admin/users/${creditModalUser.id}/credits`, {
        method: 'POST',
        body: JSON.stringify({ amount: creditAmount, description: creditReason }),
      });
      showToast('success', `Adjusted ${creditAmount > 0 ? '+' : ''}${creditAmount} credits for ${creditModalUser.email}`);
      setCreditModalUser(null);
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to adjust credits');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateLimit = async (userId: string, currentLimit: number) => {
    const val = prompt('Enter new server/container quota limit:', currentLimit.toString());
    if (val === null) return;
    const num = parseInt(val);
    if (isNaN(num) || num < 0) {
      alert('Please enter a valid positive number');
      return;
    }
    setActionLoading(`limit-${userId}`);
    try {
      await fetchApi(`/admin/users/${userId}/limit`, {
        method: 'PUT',
        body: JSON.stringify({ serverLimit: num }),
      });
      showToast('success', 'Server limit updated');
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to update limit');
    } finally {
      setActionLoading(null);
    }
  };

  // System & Maintenance Ops
  const handlePruneSystem = async () => {
    if (!confirm('Run Docker prune? This removes stopped containers older than 24h, dangling images, and unused networks.')) return;
    setActionLoading('prune');
    try {
      await fetchApi('/admin/system/prune', { method: 'POST' });
      showToast('success', 'Docker system prune executed successfully');
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'System prune failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlushRedis = async () => {
    if (!confirm('Are you sure you want to flush the Redis cache? Active sessions and temporary metrics will be reset.')) return;
    setActionLoading('flush-redis');
    try {
      await fetchApi('/admin/system/flush-redis', { method: 'POST' });
      showToast('success', 'Redis cache flushed successfully');
      fetchAllData(true);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to flush Redis');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearSessions = async () => {
    setActionLoading('clear-sessions');
    try {
      const res = await fetchApi('/admin/system/clear-sessions', { method: 'POST' });
      showToast('success', res.message || 'Expired sessions cleared');
    } catch (e: any) {
      showToast('error', e.message || 'Failed to clear sessions');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered lists
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.user?.email.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.user?.username.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesStatus = projectStatusFilter === 'all' || p.status.toLowerCase() === projectStatusFilter;
    const matchesTier = projectTierFilter === 'all' || (p.tier || 'free').toLowerCase() === projectTierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesTier = userTierFilter === 'all' || (u.tier || 'free').toLowerCase() === userTierFilter;
    return matchesSearch && matchesRole && matchesTier;
  });

  // Helpers
  const formatUptime = (sec: number) => {
    if (!sec) return '0m';
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    free: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    basic: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' },
    pro: { bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', border: 'border-purple-200' },
    business: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Loading CodeHost Control Center...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white pb-20">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-xs font-bold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand & Return */}
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all"
              >
                <ArrowLeft size={14} />
                <span>Exit Console</span>
              </Link>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-extrabold tracking-tight text-white">CodeHost</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Fleet Control
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Host Node Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Activity size={14} />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('fleet')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'fleet'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Box size={14} />
                <span>Fleet</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-md text-slate-300">
                  {projects.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'revenue'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <DollarSign size={14} />
                <span>Revenue</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users size={14} />
                <span>Users</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-md text-slate-300">
                  {users.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('host')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'host'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Server size={14} />
                <span>Host Node</span>
              </button>
            </nav>

            {/* Right: Refresh controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all ${
                  autoRefresh
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                }`}
                title="Toggle 10s auto-refresh"
              >
                <Radio size={12} className={autoRefresh ? 'animate-pulse text-emerald-400' : ''} />
                <span className="hidden sm:inline">{autoRefresh ? 'Auto 10s' : 'Paused'}</span>
              </button>

              <button
                onClick={() => fetchAllData()}
                disabled={refreshing}
                className="flex items-center space-x-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin text-blue-400' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-slate-800/60 space-x-2">
          {(['overview', 'fleet', 'revenue', 'users', 'host'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize whitespace-nowrap ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & TELEMETRY */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* KPI Ribbons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Gross Revenue</span>
                  <DollarSign size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ₹{(revenueData?.summary?.totalRevenueInr || 0).toLocaleString()}
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold mt-2">
                  <TrendingUp size={12} />
                  <span>MRR: ₹{(revenueData?.summary?.estimatedMrr || 0).toLocaleString()}/mo</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Containers Running</span>
                  <Box size={16} className="text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {stats?.activeContainers || 0}
                  <span className="text-sm font-normal text-slate-500 ml-1.5">/ {stats?.projects || 0} total</span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-blue-400 font-semibold mt-2">
                  <Zap size={12} />
                  <span>{systemMetrics?.docker?.imagesTotal || 0} local Docker images</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Host CPU Usage</span>
                  <Cpu size={16} className="text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {systemMetrics?.cpu?.percent ?? 0}%
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-semibold mt-2">
                  <span>{systemMetrics?.cpu?.cores || 1} Cores</span>
                  <span>•</span>
                  <span>Load: {(systemMetrics?.cpu?.loadAvg?.[0] ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Host Memory</span>
                  <HardDrive size={16} className="text-purple-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {systemMetrics?.memory?.percent ?? 0}%
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-purple-400 font-semibold mt-2">
                  <span>{systemMetrics?.memory?.usedGb || '0'} / {systemMetrics?.memory?.totalGb || '0'} GB</span>
                </div>
              </div>

            </div>

            {/* Telemetry Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Live CPU Utilization Area Chart */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight flex items-center space-x-2">
                      <Cpu size={16} className="text-blue-400" />
                      <span>CPU Utilization Real-Time Trend</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {systemMetrics?.cpu?.model || 'Host Processor'} • {systemMetrics?.cpu?.cores || 1} Virtual Cores
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-blue-400">
                      {systemMetrics?.cpu?.percent ?? 0}%
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {isMounted && systemMetrics?.history && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={systemMetrics.history}>
                        <defs>
                          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, fontSize: 12 }}
                          formatter={(value: any) => [`${value}%`, 'CPU Usage']}
                        />
                        <Area
                          type="monotone"
                          dataKey="cpu"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#cpuGradient)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Live RAM Utilization Area Chart */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight flex items-center space-x-2">
                      <HardDrive size={16} className="text-purple-400" />
                      <span>Host Memory (RAM) History</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {systemMetrics?.memory?.usedGb || '0'} GB Used of {systemMetrics?.memory?.totalGb || '0'} GB Total
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-purple-400">
                      {systemMetrics?.memory?.percent ?? 0}%
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {isMounted && systemMetrics?.history && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={systemMetrics.history}>
                        <defs>
                          <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, fontSize: 12 }}
                          formatter={(value: any) => [`${value}%`, 'Memory Usage']}
                        />
                        <Area
                          type="monotone"
                          dataKey="memory"
                          stroke="#a855f7"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#memGradient)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            {/* Storage Gauge & Quick Ops */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Storage Breakdown Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white flex items-center space-x-2">
                    <Database size={16} className="text-amber-400" />
                    <span>Disk & Storage Footprint</span>
                  </h3>
                  <span className="text-xs font-bold text-amber-400">{systemMetrics?.disk?.percent ?? 0}% Used</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-amber-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, systemMetrics?.disk?.percent ?? 0)}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Used Storage:</span>
                    <span className="font-bold text-slate-200">{systemMetrics?.disk?.usedGb || '0'} GB</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Free Space Available:</span>
                    <span className="font-bold text-emerald-400">{systemMetrics?.disk?.freeGb || '0'} GB</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Volume Capacity:</span>
                    <span className="font-bold text-slate-200">{systemMetrics?.disk?.totalGb || '0'} GB</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                    <span>Docker Daemon Footprint:</span>
                    <span className="font-bold text-blue-400">{systemMetrics?.docker?.imagesTotal || 0} Images</span>
                  </div>
                </div>
              </div>

              {/* Fleet Capacity Status */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-4">
                  <Sliders size={16} className="text-emerald-400" />
                  <span>Platform Resource Health</span>
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${health?.database?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold text-slate-300">PostgreSQL DB</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">{health?.database?.message || 'Nominal'}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${health?.redis?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold text-slate-300">Redis In-Memory Cache</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">{health?.redis?.message || 'Nominal'}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${health?.docker?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold text-slate-300">Docker Engine</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">v{systemMetrics?.docker?.serverVersion || '27.0'}</span>
                  </div>
                </div>
              </div>

              {/* Fast Operations Bar */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-2">
                    <Zap size={16} className="text-yellow-400" />
                    <span>Quick Fleet Operations</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Instantly trigger cluster sanitation and cache purges without SSH.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={handlePruneSystem}
                    disabled={actionLoading === 'prune'}
                    className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'prune' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="text-rose-400" />}
                    <span>Run Docker System Prune</span>
                  </button>

                  <button
                    onClick={handleFlushRedis}
                    disabled={actionLoading === 'flush-redis'}
                    className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'flush-redis' ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} className="text-amber-400" />}
                    <span>Flush Redis Cache</span>
                  </button>

                  <button
                    onClick={handleClearSessions}
                    disabled={actionLoading === 'clear-sessions'}
                    className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'clear-sessions' ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} className="text-blue-400" />}
                    <span>Purge Expired Sessions</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: COMPUTE FLEET (PROJECTS & CONTAINERS) */}
        {/* ============================================================ */}
        {activeTab === 'fleet' && (
          <div className="space-y-6">
            
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
              
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by project or owner email..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status & Tier Filters */}
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <select
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                  <option value="building">Building</option>
                </select>

                <select
                  value={projectTierFilter}
                  onChange={(e) => setProjectTierFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free Tier</option>
                  <option value="basic">Basic (₹249)</option>
                  <option value="pro">Pro (₹499)</option>
                  <option value="business">Business (₹999)</option>
                </select>
              </div>

            </div>

            {/* Fleet Projects Table */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Container / App</th>
                      <th className="px-5 py-3.5">Owner</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Tier & Specs</th>
                      <th className="px-5 py-3.5">Network & Port</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-semibold">
                          No matching projects in compute fleet.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((p) => {
                        const isRunning = p.status.toLowerCase() === 'running';
                        const currentTier = (p.tier || 'free').toLowerCase();

                        return (
                          <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-blue-400 text-xs">
                                  {p.framework?.slice(0, 2).toUpperCase() || 'CH'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                                    <span>{p.name}</span>
                                    {p.customDomain && (
                                      <a
                                        href={`https://${p.customDomain}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 10)}...</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2">
                                <UserAvatar user={p.user} size="xs" />
                                <div>
                                  <div className="font-semibold text-slate-200">{p.user?.username || 'Unknown'}</div>
                                  <div className="text-[10px] text-slate-400">{p.user?.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2">
                                <span className={`relative flex h-2 w-2`}>
                                  {isRunning && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  )}
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                    isRunning ? 'bg-emerald-500' : 'bg-slate-500'
                                  }`}></span>
                                </span>
                                <span className={`font-mono font-bold capitalize text-[11px] ${
                                  isRunning ? 'text-emerald-400' : 'text-slate-400'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <select
                                value={currentTier}
                                onChange={(e) => handleUpdateProjectTier(p.id, e.target.value)}
                                disabled={actionLoading === `tier-${p.id}`}
                                className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg font-bold text-[10px] uppercase text-blue-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              >
                                <option value="free">Free (0.5 CPU / 512MB)</option>
                                <option value="basic">Basic (1 CPU / 1GB)</option>
                                <option value="pro">Pro (2 CPU / 2GB)</option>
                                <option value="business">Business (4 CPU / 4GB)</option>
                              </select>
                            </td>

                            <td className="px-5 py-4 font-mono text-[11px] text-slate-300">
                              Port {p.port || 'Auto'}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                
                                {/* Start Container */}
                                {!isRunning && (
                                  <button
                                    onClick={() => handleStartProject(p.id, p.name)}
                                    disabled={actionLoading === `start-${p.id}`}
                                    title="Start Container"
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-50"
                                  >
                                    {actionLoading === `start-${p.id}` ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Play size={14} />
                                    )}
                                  </button>
                                )}

                                {/* Restart Container */}
                                {isRunning && (
                                  <button
                                    onClick={() => handleRestartProject(p.id, p.name)}
                                    disabled={actionLoading === `restart-${p.id}`}
                                    title="Restart Container"
                                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all disabled:opacity-50"
                                  >
                                    {actionLoading === `restart-${p.id}` ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <RotateCw size={14} />
                                    )}
                                  </button>
                                )}

                                {/* View Logs */}
                                <button
                                  onClick={() => handleOpenLogs(p)}
                                  title="View Container Logs"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                                >
                                  <Terminal size={14} />
                                </button>

                                {/* Kill Container */}
                                {isRunning && (
                                  <button
                                    onClick={() => handleKillProject(p.id, p.name)}
                                    disabled={actionLoading === `kill-${p.id}`}
                                    title="Stop / Kill Container"
                                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all disabled:opacity-50"
                                  >
                                    {actionLoading === `kill-${p.id}` ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Power size={14} />
                                    )}
                                  </button>
                                )}

                                {/* Delete Project */}
                                <button
                                  onClick={() => handleDeleteProject(p.id, p.name)}
                                  disabled={actionLoading === `delete-proj-${p.id}`}
                                  title="Permanently Delete Project"
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50"
                                >
                                  {actionLoading === `delete-proj-${p.id}` ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>

                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: REVENUE & FINANCIALS */}
        {/* ============================================================ */}
        {activeTab === 'revenue' && (
          <div className="space-y-8">
            
            {/* Revenue Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gross Collections</div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{(revenueData?.summary?.totalRevenueInr || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {(revenueData?.summary?.totalRevenueCredits || 0).toLocaleString()} platform credits
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated MRR</div>
                <div className="text-2xl font-black text-blue-400">
                  ₹{(revenueData?.summary?.estimatedMrr || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Monthly run-rate</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ARPU (Per User)</div>
                <div className="text-2xl font-black text-purple-400">
                  ₹{(revenueData?.summary?.arpu || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Average revenue / user</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paid Conversion</div>
                <div className="text-2xl font-black text-indigo-400">
                  {revenueData?.summary?.conversionRate ?? 0}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {revenueData?.summary?.paidUsers || 0} of {revenueData?.summary?.totalUsers || 1} users
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Wallet Float</div>
                <div className="text-2xl font-black text-amber-400">
                  ₹{(revenueData?.summary?.totalWalletFloatInr || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {(revenueData?.summary?.totalWalletFloatCredits || 0).toLocaleString()} credits held
                </div>
              </div>

            </div>

            {/* 30-Day Revenue Trend Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center space-x-2">
                      <TrendingUp size={16} className="text-emerald-400" />
                      <span>30-Day Revenue Trajectory (₹ INR)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Aggregated daily purchase and subscription volume</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {isMounted && revenueData?.revenueTrend && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData.revenueTrend}>
                        <defs>
                          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, fontSize: 12 }}
                          formatter={(val: any) => [`₹${val}`, 'Revenue']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#revGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Tier Distribution Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-black text-white flex items-center space-x-2 mb-4">
                  <Layers size={16} className="text-purple-400" />
                  <span>Tier Distribution</span>
                </h3>

                <div className="space-y-3">
                  {[
                    { key: 'free', label: 'Free Tier', price: '₹0', color: 'text-slate-400' },
                    { key: 'basic', label: 'Basic Plan', price: '₹249/mo', color: 'text-blue-400' },
                    { key: 'pro', label: 'Pro Plan', price: '₹499/mo', color: 'text-purple-400' },
                    { key: 'business', label: 'Business Plan', price: '₹999/mo', color: 'text-emerald-400' },
                  ].map((t) => {
                    const data = revenueData?.tierBreakdown?.[t.key] || { users: 0, projects: 0, revenueInr: 0 };
                    return (
                      <div key={t.key} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className={t.color}>{t.label}</span>
                          <span className="text-slate-300">{t.price}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{data.users} users • {data.projects} projects</span>
                          <span className="font-semibold text-white">₹{data.revenueInr.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Transactions Ledger */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              
              {/* Ledger Header & Search */}
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-2">
                    <CreditCard size={16} className="text-blue-400" />
                    <span>Transactions Ledger</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Search customer orders, credits, and Razorpay payment records</p>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search email, ID, razorpay..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchTransactions(1)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="purchase">Purchase</option>
                    <option value="usage">Usage</option>
                    <option value="admin_grant">Admin Grant</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Payment Reference</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {txLoading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-bold">
                          <Loader2 size={18} className="animate-spin inline mr-2 text-blue-400" />
                          Loading ledger...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500 font-bold">
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-200">
                            <div>{tx.wallet?.user?.username || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-400">{tx.wallet?.user?.email || 'N/A'}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              tx.type === 'purchase'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : tx.type === 'admin_grant'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono font-bold text-slate-100">
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount} credits
                          </td>
                          <td className="px-5 py-3 font-mono text-[10px] text-slate-400">
                            {tx.razorpayPaymentId || tx.razorpayOrderId || tx.description || 'System auto'}
                          </td>
                          <td className="px-5 py-3 text-slate-400 text-[11px]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Page {txPage} of {txTotalPages}</span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={txPage <= 1 || txLoading}
                    onClick={() => fetchTransactions(txPage - 1)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={txPage >= txTotalPages || txLoading}
                    onClick={() => fetchTransactions(txPage + 1)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: USERS & IAM */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            
            {/* Filter & Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
              
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by email or username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>

                <select
                  value={userTierFilter}
                  onChange={(e) => setUserTierFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Add User</span>
                </button>
              </div>

            </div>

            {/* Users Directory Table */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">User Profile</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Subscription Tier</th>
                      <th className="px-5 py-3.5">Containers / Limit</th>
                      <th className="px-5 py-3.5">Wallet Balance</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-semibold">
                          No matching users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const tierKey = (u.tier || 'free').toLowerCase();
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-3">
                                <UserAvatar user={u} size="sm" />
                                <div>
                                  <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                                    <span>{u.username}</span>
                                    {u.emailVerified && (
                                      <CheckCircle2 size={12} className="text-blue-400" />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                u.role === 'ADMIN'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {u.role}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                  tierKey === 'business'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : tierKey === 'pro'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : tierKey === 'basic'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {u.tier || 'FREE'}
                                </span>
                                <button
                                  onClick={() => {
                                    setTierModalUser(u);
                                    setSelectedUserTier(u.tier || 'free');
                                  }}
                                  className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold"
                                >
                                  Change
                                </button>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-slate-200">
                                  {u._count?.projects || 0} / {u.serverLimit}
                                </span>
                                <button
                                  onClick={() => handleUpdateLimit(u.id, u.serverLimit)}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                  title="Edit quota"
                                >
                                  <Settings size={12} />
                                </button>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-slate-200">
                                  {u.wallet?.balance ?? 0} cr
                                </span>
                                <button
                                  onClick={() => {
                                    setCreditModalUser(u);
                                    setCreditAmount(100);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold border border-emerald-500/20"
                                >
                                  + Credits
                                </button>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={actionLoading === `delete-user-${u.id}`}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50"
                                title="Delete user"
                              >
                                {actionLoading === `delete-user-${u.id}` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: HOST NODE & MAINTENANCE */}
        {/* ============================================================ */}
        {activeTab === 'host' && (
          <div className="space-y-8">
            
            {/* Host Node Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Node Architecture</span>
                <div className="text-lg font-black text-white mt-1">
                  {systemMetrics?.host?.arch?.toUpperCase() || 'X64'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {systemMetrics?.host?.platform} • {systemMetrics?.host?.release}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Server Hostname</span>
                <div className="text-lg font-black text-white mt-1 truncate">
                  {systemMetrics?.host?.hostname || 'codehost-vps'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Node.js {systemMetrics?.host?.nodeVersion || 'v20'}</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Uptime</span>
                <div className="text-lg font-black text-emerald-400 mt-1">
                  {formatUptime(systemMetrics?.host?.uptimeSeconds || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Continuous host uptime</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Docker Daemon</span>
                <div className="text-lg font-black text-blue-400 mt-1">
                  {systemMetrics?.docker?.containersRunning || 0} Containers
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  v{systemMetrics?.docker?.serverVersion || '27.0'} Active
                </div>
              </div>

            </div>

            {/* Health & Infrastructure Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Database size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">PostgreSQL Storage</h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">Healthy & Connected</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Prisma ORM connected to primary cluster with connection pooling.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Redis Cache Store</h4>
                    <span className="text-[10px] text-emerald-400 font-semibold">Ping Latency: ~1ms</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Used for real-time telemetry buffering, rate limiting, and session caching.
                </p>
                <button
                  onClick={handleFlushRedis}
                  disabled={actionLoading === 'flush-redis'}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
                >
                  Flush Redis In-Memory Keys
                </button>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Box size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Docker Fleet Pruning</h4>
                    <span className="text-[10px] text-amber-400 font-semibold">{systemMetrics?.docker?.imagesTotal || 0} images stored</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Purge dangling builder images and stopped dead containers to free disk space.
                </p>
                <button
                  onClick={handlePruneSystem}
                  disabled={actionLoading === 'prune'}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
                >
                  Run Full Docker Prune
                </button>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ============================================================ */}
      {/* MODAL: CONTAINER LIVE LOG INSPECTOR */}
      {/* ============================================================ */}
      {logModalProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <Terminal size={18} className="text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-2">
                    <span>Logs: {logModalProject.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      ID: {logModalProject.id.slice(0, 8)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Streaming raw container stdout / stderr output</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={logTail}
                  onChange={(e) => setLogTail(parseInt(e.target.value))}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
                >
                  <option value={50}>Tail 50</option>
                  <option value={100}>Tail 100</option>
                  <option value={250}>Tail 250</option>
                  <option value={500}>Tail 500</option>
                </select>

                <button
                  onClick={handleRefreshLogs}
                  disabled={logsLoading}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all disabled:opacity-50"
                  title="Refresh logs"
                >
                  <RefreshCw size={14} className={logsLoading ? 'animate-spin text-blue-400' : ''} />
                </button>

                <button
                  onClick={() => setLogModalProject(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-4 bg-slate-950 flex-1 overflow-y-auto font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap select-all">
              {logsLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500 font-sans">
                  <Loader2 size={20} className="animate-spin mr-2 text-blue-400" />
                  Streaming logs from Docker...
                </div>
              ) : projectLogs ? (
                projectLogs
              ) : (
                <span className="text-slate-600">No output lines recorded yet.</span>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">Container Status: {logModalProject.status}</span>
              <button
                onClick={() => setLogModalProject(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD NEW USER */}
      {/* ============================================================ */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-white">Create New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Container Quota</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newUser.serverLimit}
                    onChange={(e) => setNewUser({ ...newUser, serverLimit: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create-user'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading === 'create-user' ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: USER TIER OVERRIDE */}
      {/* ============================================================ */}
      {tierModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-white">Override Subscription Tier</h3>
                <p className="text-[11px] text-slate-400">{tierModalUser.email}</p>
              </div>
              <button onClick={() => setTierModalUser(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Tier</label>
                <select
                  value={selectedUserTier}
                  onChange={(e) => setSelectedUserTier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="free">Free Tier</option>
                  <option value="basic">Basic (₹249/mo)</option>
                  <option value="pro">Pro (₹499/mo)</option>
                  <option value="business">Business (₹999/mo)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={tierDurationDays}
                  onChange={(e) => setTierDurationDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTierModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserTier}
                  disabled={actionLoading === 'save-tier'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading === 'save-tier' ? 'Updating...' : 'Save Tier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: GRANT / ADJUST USER CREDITS */}
      {/* ============================================================ */}
      {creditModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-white">Adjust Wallet Credits</h3>
                <p className="text-[11px] text-slate-400">{creditModalUser.email} (Current: {creditModalUser.wallet?.balance ?? 0} cr)</p>
              </div>
              <button onClick={() => setCreditModalUser(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Credits Amount (Use negative to deduct)
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Reason / Description</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreditModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantCredits}
                  disabled={actionLoading === 'grant-credits'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading === 'grant-credits' ? 'Adjusting...' : 'Apply Credits'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
