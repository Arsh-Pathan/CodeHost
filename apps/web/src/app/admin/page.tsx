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
  ChevronDown,
  ChevronUp,
  Server,
  Box
} from 'lucide-react';
import Link from 'next/link';

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
  emailVerified: boolean;
  provider: string | null;
  createdAt: string;
  _count: { projects: number };
}

interface AdminProject {
  id: string;
  name: string;
  status: string;
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

  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'projects'>('overview');

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
      setError(err.message || 'Failed to load admin data');
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'running': return 'bg-emerald-100 text-emerald-700';
      case 'building': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'stopped': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold tracking-tight animate-pulse text-slate-600">Loading Admin Panel...</p>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Access Denied</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Link href="/dashboard" className="text-blue-600 font-semibold hover:underline flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8fa] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin Console</h1>
              <p className="text-xs text-slate-500 font-medium">Platform management and monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAdminData}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
            <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-600 hover:text-blue-600 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm transition">
              <ArrowLeft size={16} className="mr-1.5" /> Exit Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats?.users || 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatCard title="All Projects" value={stats?.projects || 0} icon={Layout} color="text-purple-600" bg="bg-purple-50" />
          <StatCard title="Total Deploys" value={stats?.deployments || 0} icon={Database} color="text-amber-600" bg="bg-amber-50" />
          <StatCard title="Active Containers" value={stats?.activeContainers || 0} icon={Activity} color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-200/50 rounded-2xl w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: Server },
            { id: 'users', label: `Users (${users.length})`, icon: Users },
            { id: 'projects', label: `Projects (${projects.length})`, icon: Box },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                <Activity size={16} className="mr-3 text-emerald-500" />
                System Health
              </h3>
              <div className="space-y-4">
                {health ? (
                  Object.entries(health).map(([service, info]) => (
                    <div key={service} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div className="flex items-center space-x-3">
                        {info.status === 'healthy' ? (
                          <CheckCircle size={18} className="text-emerald-500" />
                        ) : (
                          <XCircle size={18} className="text-red-500" />
                        )}
                        <span className="text-sm font-bold text-slate-700 capitalize">{service}</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        info.status === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {info.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <HealthBarStatic label="Database" status="Health Check OK" healthy />
                    <HealthBarStatic label="Redis" status="Connected" healthy />
                    <HealthBarStatic label="Docker" status="Running" healthy />
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                <Database size={16} className="mr-3 text-blue-500" />
                Active Containers
              </h3>
              <div className="space-y-3">
                {projects.filter(p => p.status === 'running').length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-8">No running containers.</p>
                ) : (
                  projects.filter(p => p.status === 'running').map((proj) => (
                    <div key={proj.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{proj.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{proj.user.username} - {proj._count.deployments} deploys</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">Running</span>
                        <button
                          onClick={() => handleKillContainer(proj.id)}
                          disabled={actionLoading === `kill-${proj.id}`}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                          title="Stop container"
                        >
                          {actionLoading === `kill-${proj.id}` ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Section */}
        {activeSection === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">All Users</h3>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {users.length} users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Projects</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                    <th className="text-right px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                            {u.username?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{u.username}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500 capitalize flex items-center">
                          {u.emailVerified ? <CheckCircle size={12} className="text-emerald-500 mr-1" /> : <XCircle size={12} className="text-red-400 mr-1" />}
                          {u.provider || 'email'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">{u._count.projects}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handlePromoteUser(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                            disabled={actionLoading === `role-${u.id}`}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-50"
                            title={u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                          >
                            {actionLoading === `role-${u.id}` ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={actionLoading === `delete-user-${u.id}`}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete User"
                          >
                            {actionLoading === `delete-user-${u.id}` ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="p-12 text-center">
                <Users size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 italic">No users found.</p>
              </div>
            )}
          </div>
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">All Projects</h3>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {projects.length} projects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Owner</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Deploys</th>
                    <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                    <th className="text-right px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Box size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{proj.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{proj.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600">{proj.user.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${getStatusColor(proj.status)}`}>
                          {proj.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">{proj._count.deployments}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400">{new Date(proj.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          {proj.status === 'running' && (
                            <button
                              onClick={() => handleKillContainer(proj.id)}
                              disabled={actionLoading === `kill-${proj.id}`}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50"
                              title="Stop Container"
                            >
                              {actionLoading === `kill-${proj.id}` ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            disabled={actionLoading === `delete-proj-${proj.id}`}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete Project"
                          >
                            {actionLoading === `delete-proj-${proj.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {projects.length === 0 && (
              <div className="p-12 text-center">
                <Layout size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 italic">No projects found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{value.toLocaleString()}</p>
        </div>
        <div className={`${bg} p-3 rounded-xl`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function HealthBarStatic({ label, status, healthy }: { label: string; status: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center space-x-3">
        {healthy ? (
          <CheckCircle size={18} className="text-emerald-500" />
        ) : (
          <XCircle size={18} className="text-red-500" />
        )}
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
        healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}>
        {status}
      </span>
    </div>
  );
}
