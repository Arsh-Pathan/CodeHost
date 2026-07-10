"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
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
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Settings,
  MoreVertical,
  Terminal,
  Cpu,
  HardDrive,
  Globe,
  Bell,
  Menu,
  Server,
  Box,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  users: number;
  projects: number;
  deployments: number;
  activeContainers: number;
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  serverLimit: number;
  emailVerified: boolean;
  provider: string | null;
  createdAt: string;
  _count: { projects: number };
}

interface AdminProject {
  id: string;
  name: string;
  status: string;
  tier: string;
  containerId: string | null;
  userId: string;
  createdAt: string;
  user: { email: string; username: string };
  _count: { deployments: number };
}

interface HealthStatus {
  [key: string]: { status: string; message: string };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<'overview' | 'compute' | 'iam' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // User Management Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', role: 'USER', serverLimit: 1 });

  const fetchAdminData = async () => {
    try {
      const userRes = await fetchApi('/auth/me');

      if (userRes.user.role !== 'ADMIN') {
        setError('Admin privileges required.');
        setLoading(false);
        return;
      }

      const [statsData, healthData, usersData, projectsData] = await Promise.all([
        fetchApi('/admin/stats'),
        fetchApi('/admin/health').catch(() => null),
        fetchApi('/admin/users'),
        fetchApi('/admin/projects'),
      ]);

      setStats(statsData);
      if (healthData) setHealth(healthData.health);
      setUsers(usersData.users);
      setProjects(projectsData.projects);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError(err.message || 'Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  const handlePromoteUser = async (userId: string, newRole: string) => {
    if (!confirm(`Change user role to ${newRole}?`)) return;
    setActionLoading(`role-${userId}`);
    try {
      await fetchApi(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete user "${email}" and all their projects?`)) return;
    setActionLoading(`delete-user-${userId}`);
    try {
      await fetchApi(`/admin/users/${userId}`, { method: 'DELETE' });
      await fetchAdminData();
      setShowUserModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleKillContainer = async (projectId: string) => {
    if (!confirm('Stop this container?')) return;
    setActionLoading(`kill-${projectId}`);
    try {
      await fetchApi(`/admin/projects/${projectId}/kill`, { method: 'POST' });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateLimit = async (userId: string, newLimit: number) => {
    setActionLoading(`limit-${userId}`);
    try {
      await fetchApi(`/admin/users/${userId}/limit`, {
        method: 'PUT',
        body: JSON.stringify({ serverLimit: newLimit })
      });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create-user');
    try {
      await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setShowUserModal(false);
      setNewUser({ email: '', username: '', password: '', role: 'USER', serverLimit: 1 });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Permanently delete this project?')) return;
    setActionLoading(`delete-proj-${projectId}`);
    try {
      await fetchApi(`/admin/projects/${projectId}`, { method: 'DELETE' });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTier = async (projectId: string, newTier: string) => {
    if (!confirm(`Change capacity tier to ${newTier.toUpperCase()}? This will restart the server if running.`)) return;
    setActionLoading(`tier-${projectId}`);
    try {
      await fetchApi(`/admin/projects/${projectId}/tier`, {
        method: 'PUT',
        body: JSON.stringify({ tier: newTier }),
      });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunPrune = async () => {
    if (!confirm('Run Docker prune? This will remove all dangling images and unused networks.')) return;
    setActionLoading('prune');
    try {
      await fetchApi('/admin/system/prune', { method: 'POST' });
      alert('System prune completed successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!confirm('Toggle Maintenance Mode?')) return;
    setActionLoading('maintenance');
    try {
      await fetchApi('/admin/system/maintenance', { 
        method: 'POST', 
        body: JSON.stringify({ enabled: true }) // Simplified for now, just sets it
      });
      alert('Maintenance mode toggled.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'running': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'building': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'stopped': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa] space-y-4 font-sans text-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold tracking-tight animate-pulse">Initializing Admin Workspace...</p>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] px-4 font-sans">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Access Denied</h2>
        <p className="text-slate-500 mb-8 font-medium">{error}</p>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-bold flex items-center justify-center transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u => u.email.includes(searchQuery) || u.username.includes(searchQuery));
  const filteredProjects = projects.filter(p => p.name.includes(searchQuery) || p.user.username.includes(searchQuery));

  return (
    <div className="flex h-screen bg-[#f6f8fa] font-sans text-slate-900">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0 hidden'} flex-shrink-0 border-r border-slate-200 bg-white flex flex-col transition-all duration-300 z-10 shadow-sm`}>
        <div className="h-16 border-b border-slate-100 flex items-center px-6">
          <Shield className="h-6 w-6 text-blue-600 mr-3" />
          <span className="font-black text-lg tracking-tight text-slate-900">Admin<span className="text-blue-600">Panel</span></span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
          
          <div className="space-y-2">
            <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace</span>
            <SidebarItem icon={Activity} label="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
          </div>
          
          <div className="space-y-2">
            <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Infrastructure</span>
            <SidebarItem icon={Server} label="Instances" active={activeSection === 'compute'} onClick={() => setActiveSection('compute')} badge={projects.length} />
            <SidebarItem icon={Users} label="Accounts" active={activeSection === 'iam'} onClick={() => setActiveSection('iam')} badge={users.length} />
          </div>
          
          <div className="space-y-2">
            <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">System</span>
            <SidebarItem icon={Settings} label="Global Settings" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f6f8fa]">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all rounded-lg mr-4">
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 capitalize">
              {activeSection === 'overview' && 'Platform Overview'}
              {activeSection === 'compute' && 'Instance Management'}
              {activeSection === 'iam' && 'Account Administration'}
              {activeSection === 'settings' && 'Global Configurations'}
            </h1>
          </div>
          <div className="flex items-center flex-1 max-w-md px-8 ml-auto">
            <div className="w-full relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-10 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
            <button onClick={fetchAdminData} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg" title="Refresh">
              <RefreshCw size={18} />
            </button>
            <Link href="/dashboard" className="flex items-center p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all rounded-lg text-sm font-bold">
              <ArrowLeft size={16} className="mr-2" /> Exit
            </Link>
          </div>
        </header>

        {/* Action Bar */}
        {activeSection === 'iam' && (
          <div className="h-16 bg-[#f6f8fa] flex items-center px-8 flex-shrink-0 justify-end">
            <button 
              onClick={() => { setSelectedUser(null); setShowUserModal(true); }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 flex items-center"
            >
              <Users size={16} className="mr-2" /> Create Account
            </button>
          </div>
        )}

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-8">
          
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-8 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Accounts" value={stats?.users || 0} icon={Users} color="blue" />
                <StatCard title="Total Instances" value={stats?.projects || 0} icon={Server} color="purple" />
                <StatCard title="Running Now" value={stats?.activeContainers || 0} icon={Activity} color="emerald" />
                <StatCard title="Total Deployments" value={stats?.deployments || 0} icon={Box} color="amber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                    <Shield className="w-5 h-5 text-blue-600 mr-3" /> System Health
                  </h2>
                  <div className="space-y-4">
                    {health ? Object.entries(health).map(([service, info]) => (
                      <div key={service} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${info.status === 'healthy' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {info.status === 'healthy' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 capitalize">{service}</h3>
                            <p className="text-xs font-medium text-slate-500">{info.message}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${info.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {info.status}
                        </span>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-400 font-medium animate-pulse">Pinging services...</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                    <Activity className="w-5 h-5 text-emerald-500 mr-3" /> Live Instances
                  </h2>
                  <div className="space-y-3">
                    {projects.filter(p => p.status === 'running').slice(0, 5).map(proj => (
                      <div key={proj.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{proj.name}</h3>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Tier: {proj.tier}</p>
                        </div>
                        <span className="flex items-center text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse" /> Running
                        </span>
                      </div>
                    ))}
                    {projects.filter(p => p.status === 'running').length === 0 && (
                      <div className="p-10 text-center flex flex-col items-center border-2 border-dashed border-slate-100 rounded-2xl">
                        <Activity size={32} className="text-slate-200 mb-3" />
                        <p className="text-slate-400 font-medium">No active instances running on the network.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Analytics Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                    <Box className="w-5 h-5 text-purple-500 mr-3" /> Instance States
                  </h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Running', value: projects.filter(p => p.status === 'running').length, color: '#10b981' },
                            { name: 'Building', value: projects.filter(p => p.status === 'building').length, color: '#3b82f6' },
                            { name: 'Stopped', value: projects.filter(p => p.status === 'stopped').length, color: '#f59e0b' },
                            { name: 'Failed', value: projects.filter(p => p.status === 'failed').length, color: '#ef4444' },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                          dataKey="value" stroke="none" label
                        >
                          {
                            [
                              { name: 'Running', value: projects.filter(p => p.status === 'running').length, color: '#10b981' },
                              { name: 'Building', value: projects.filter(p => p.status === 'building').length, color: '#3b82f6' },
                              { name: 'Stopped', value: projects.filter(p => p.status === 'stopped').length, color: '#f59e0b' },
                              { name: 'Failed', value: projects.filter(p => p.status === 'failed').length, color: '#ef4444' },
                            ].filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                    <Server className="w-5 h-5 text-blue-500 mr-3" /> Hardware Tiers
                  </h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Free Tier', value: projects.filter(p => p.tier === 'free' || !p.tier).length, color: '#94a3b8' },
                            { name: 'Pro Tier', value: projects.filter(p => p.tier === 'pro').length, color: '#3b82f6' },
                            { name: 'Elite Tier', value: projects.filter(p => p.tier === 'elite').length, color: '#8b5cf6' },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                          dataKey="value" stroke="none" label
                        >
                          {
                            [
                              { name: 'Free Tier', value: projects.filter(p => p.tier === 'free' || !p.tier).length, color: '#94a3b8' },
                              { name: 'Pro Tier', value: projects.filter(p => p.tier === 'pro').length, color: '#3b82f6' },
                              { name: 'Elite Tier', value: projects.filter(p => p.tier === 'elite').length, color: '#8b5cf6' },
                            ].filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compute Section */}
          {activeSection === 'compute' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm max-w-[1400px] mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Instance</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Owner</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tier</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Created</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3">
                              <Box size={16} />
                            </div>
                            <span className="font-bold text-slate-900">{proj.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500">{proj.user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${getStatusColor(proj.status)}`}>
                            {proj.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={proj.tier || 'free'}
                            onChange={(e) => handleUpdateTier(proj.id, e.target.value)}
                            disabled={actionLoading === `tier-${proj.id}`}
                            className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="free">FREE</option>
                            <option value="pro">PRO</option>
                            <option value="elite">ELITE</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium text-xs">{new Date(proj.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {proj.status === 'running' && (
                              <button
                                onClick={() => handleKillContainer(proj.id)}
                                disabled={actionLoading === `kill-${proj.id}`}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Stop Instance"
                              >
                                {actionLoading === `kill-${proj.id}` ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              disabled={actionLoading === `delete-proj-${proj.id}`}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete Instance"
                            >
                              {actionLoading === `delete-proj-${proj.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">No instances match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IAM Section */}
          {activeSection === 'iam' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm max-w-[1400px] mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Account Details</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Quotas</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Provider</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => { setSelectedUser(u); setShowUserModal(true); }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm mr-4">
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                               <div className="font-bold text-slate-900">{u.username}</div>
                               <div className="text-xs font-medium text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{u._count.projects} <span className="text-slate-400 font-medium mx-1">/</span> {u.serverLimit || 1}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instances</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium capitalize text-xs">
                          {u.provider || 'Local'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setShowUserModal(true); }}
                          >
                            <Settings size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">No accounts match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-8 mx-auto">
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="mb-8">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Platform Settings</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Manage global platform configurations and emergency controls.</p>
                </div>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Docker System Prune</h3>
                    <p className="text-xs font-medium text-slate-500 mb-4">Clean up unused containers, networks, dangling images, and build caches to free up disk space.</p>
                    <button 
                      onClick={handleRunPrune}
                      disabled={actionLoading === 'prune'}
                      className="px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-50"
                    >
                      {actionLoading === 'prune' ? 'Pruning...' : 'Run Prune'}
                    </button>
                  </div>
                  <div className="pt-8 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-red-600 mb-2">Maintenance Mode</h3>
                    <p className="text-xs font-medium text-slate-500 mb-4">Block new deployments and logins across the platform. Running apps will remain unaffected.</p>
                    <button 
                      onClick={handleToggleMaintenance}
                      disabled={actionLoading === 'maintenance'}
                      className="px-5 py-2.5 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'maintenance' ? 'Toggling...' : 'Enable Maintenance Mode'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* User Edit / Create Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {selectedUser ? 'Account details' : 'Create new account'}
              </h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto">
              {selectedUser ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email address</label>
                    <div className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedUser.email}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Username</label>
                    <div className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedUser.username}</div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Role</label>
                      <select 
                        value={selectedUser.role} 
                        onChange={(e) => handlePromoteUser(selectedUser.id, e.target.value)}
                        className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Instance Quota</label>
                      <input 
                        type="number" 
                        value={selectedUser.serverLimit} 
                        onChange={(e) => handleUpdateLimit(selectedUser.id, parseInt(e.target.value))}
                        className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-8 mt-4 border-t border-slate-100">
                    <button 
                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                      className="w-full justify-center text-red-600 text-xs font-black uppercase tracking-widest flex items-center bg-red-50 hover:bg-red-100 border border-red-100 p-3 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email address</label>
                    <input 
                      type="email" required 
                      value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Username</label>
                    <input 
                      type="text" required 
                      value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                      className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Password</label>
                    <input 
                      type="password" required minLength={6}
                      value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Role</label>
                      <select 
                        value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                        className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Quota</label>
                      <input 
                        type="number" min="0" required
                        value={newUser.serverLimit} onChange={e => setNewUser({...newUser, serverLimit: parseInt(e.target.value)})}
                        className="w-full text-sm font-bold border border-slate-200 bg-white rounded-xl p-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div className="pt-6 flex justify-end space-x-3">
                    <button type="button" onClick={() => setShowUserModal(false)} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={actionLoading === 'create-user'} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
                      Create Account
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 rounded-xl text-sm transition-all group ${
        active 
          ? 'bg-blue-50 text-blue-600 font-bold' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
      }`}
    >
      <Icon size={18} className={`mr-3 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  
  const iconColor = colors[color as keyof typeof colors] || colors.blue;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        <div className={`p-2 rounded-xl ${iconColor} transition-transform group-hover:scale-110`}>
          <Icon size={18} />
        </div>
      </div>
      <span className="text-4xl font-extrabold tracking-tight text-slate-900">{value.toLocaleString()}</span>
    </div>
  );
}
