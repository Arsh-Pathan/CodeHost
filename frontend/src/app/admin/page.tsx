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
  Menu
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'running': return 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]';
      case 'building': return 'bg-[#e8f0fe] text-[#1967d2] border-[#d2e3fc]';
      case 'failed': return 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]';
      case 'stopped': return 'bg-[#fef7e0] text-[#b06000] border-[#fde293]';
      default: return 'bg-[#f1f3f4] text-[#3c4043] border-[#e8eaed]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#1a73e8]" />
        <p className="font-semibold text-[#5f6368]">Loading CodeHost Console...</p>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-lg shadow border border-[#fad2cf]">
        <ShieldAlert className="h-12 w-12 text-[#c5221f] mx-auto mb-4" />
        <h2 className="text-xl font-medium text-[#202124] mb-4">Access Denied</h2>
        <p className="text-[#5f6368] mb-6">{error}</p>
        <Link href="/dashboard" className="text-[#1a73e8] hover:underline flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u => u.email.includes(searchQuery) || u.username.includes(searchQuery));
  const filteredProjects = projects.filter(p => p.name.includes(searchQuery) || p.user.username.includes(searchQuery));

  return (
    <div className="flex h-screen bg-white font-sans text-[#202124]">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0 hidden'} flex-shrink-0 border-r border-[#dadce0] bg-[#f8f9fa] flex flex-col transition-all duration-300`}>
        <div className="h-12 border-b border-[#dadce0] flex items-center px-4">
          <Globe className="h-6 w-6 text-[#1a73e8] mr-2" />
          <span className="font-medium text-[15px] text-[#5f6368]">CodeHost Platform</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-4 py-2">
            <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Dashboard</span>
          </div>
          <SidebarItem icon={Activity} label="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
          
          <div className="px-4 py-2 mt-4">
            <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Compute</span>
          </div>
          <SidebarItem icon={Server} label="App Engine" active={activeSection === 'compute'} onClick={() => setActiveSection('compute')} badge={projects.length} />
          
          <div className="px-4 py-2 mt-4">
            <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Security</span>
          </div>
          <SidebarItem icon={Users} label="IAM & Admin" active={activeSection === 'iam'} onClick={() => setActiveSection('iam')} badge={users.length} />
          
          <div className="px-4 py-2 mt-4">
            <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">System</span>
          </div>
          <SidebarItem icon={Settings} label="Settings" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header */}
        <header className="h-12 bg-[#1a73e8] text-white flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-full mr-2">
              <Menu size={20} />
            </button>
            <span className="text-lg font-medium">Cloud Console</span>
          </div>
          <div className="flex items-center flex-1 max-w-2xl px-8">
            <div className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              <input 
                type="text" 
                placeholder="Search resources and products" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded h-8 pl-10 pr-4 text-sm text-white placeholder-white/70 focus:bg-white focus:text-[#202124] focus:placeholder-[#5f6368] transition-colors outline-none"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={fetchAdminData} className="p-2 hover:bg-white/10 rounded-full" title="Refresh">
              <RefreshCw size={18} />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full">
              <Bell size={18} />
            </button>
            <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full">
              <ArrowLeft size={18} />
            </Link>
          </div>
        </header>

        {/* Top Action Bar (Sub-header) */}
        <div className="h-12 border-b border-[#dadce0] bg-white flex items-center px-6 flex-shrink-0 justify-between">
          <h1 className="text-lg font-normal text-[#202124]">
            {activeSection === 'overview' && 'Dashboard'}
            {activeSection === 'compute' && 'App Engine Instances'}
            {activeSection === 'iam' && 'IAM & Admin'}
            {activeSection === 'settings' && 'Platform Settings'}
          </h1>
          
          {activeSection === 'iam' && (
            <button 
              onClick={() => { setSelectedUser(null); setShowUserModal(true); }}
              className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-medium rounded transition-colors"
            >
              CREATE PRINCIPAL
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-6 bg-white">
          
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6 max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GCPCard title="Total Users" value={stats?.users || 0} />
                <GCPCard title="Total Projects" value={stats?.projects || 0} />
                <GCPCard title="Active Containers" value={stats?.activeContainers || 0} />
                <GCPCard title="Total Deployments" value={stats?.deployments || 0} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-[#dadce0] rounded bg-white">
                  <div className="px-4 py-3 border-b border-[#dadce0]">
                    <h2 className="text-[15px] font-medium text-[#202124]">System Health</h2>
                  </div>
                  <div className="p-0">
                    <table className="w-full text-sm text-left">
                      <tbody>
                        {health ? Object.entries(health).map(([service, info]) => (
                          <tr key={service} className="border-b border-[#dadce0] last:border-0">
                            <td className="px-4 py-3 capitalize font-medium text-[#202124]">{service}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center text-[#137333]">
                                {info.status === 'healthy' ? <CheckCircle size={16} className="mr-1.5" /> : <XCircle size={16} className="text-[#c5221f] mr-1.5" />}
                                {info.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#5f6368]">{info.message}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="px-4 py-3 text-center text-[#5f6368]">Loading health...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-[#dadce0] rounded bg-white">
                  <div className="px-4 py-3 border-b border-[#dadce0]">
                    <h2 className="text-[15px] font-medium text-[#202124]">Compute Engine - Running</h2>
                  </div>
                  <div className="p-0">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#f8f9fa] border-b border-[#dadce0]">
                        <tr>
                          <th className="px-4 py-2 font-medium text-[#5f6368]">Name</th>
                          <th className="px-4 py-2 font-medium text-[#5f6368]">Zone/Tier</th>
                          <th className="px-4 py-2 font-medium text-[#5f6368]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.filter(p => p.status === 'running').slice(0, 5).map(proj => (
                          <tr key={proj.id} className="border-b border-[#dadce0] last:border-0">
                            <td className="px-4 py-2 text-[#1a73e8] cursor-pointer hover:underline">{proj.name}</td>
                            <td className="px-4 py-2 text-[#202124] uppercase text-xs">{proj.tier}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center text-xs font-medium bg-[#e6f4ea] text-[#137333] px-2 py-0.5 rounded-full border border-[#ceead6]">
                                Running
                              </span>
                            </td>
                          </tr>
                        ))}
                        {projects.filter(p => p.status === 'running').length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-6 text-center text-[#5f6368]">No running instances.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compute Section */}
          {activeSection === 'compute' && (
            <div className="border border-[#dadce0] rounded bg-white overflow-hidden max-w-[1400px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#f8f9fa] border-b border-[#dadce0]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Instance Name</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Principal</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Status</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Machine Type</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Creation Time</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dadce0]">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <Box className="h-4 w-4 mr-2 text-[#5f6368]" />
                            <span className="font-medium text-[#202124]">{proj.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#5f6368]">{proj.user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(proj.status)}`}>
                            {proj.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={proj.tier || 'free'}
                            onChange={(e) => handleUpdateTier(proj.id, e.target.value)}
                            disabled={actionLoading === `tier-${proj.id}`}
                            className="text-xs bg-transparent border-none outline-none text-[#1a73e8] cursor-pointer hover:bg-black/5 rounded px-1"
                          >
                            <option value="free">e2-micro (Free)</option>
                            <option value="pro">e2-small (Pro)</option>
                            <option value="elite">e2-medium (Elite)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-[#5f6368]">{new Date(proj.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            {proj.status === 'running' && (
                              <button
                                onClick={() => handleKillContainer(proj.id)}
                                disabled={actionLoading === `kill-${proj.id}`}
                                className="text-[#5f6368] hover:text-[#202124] disabled:opacity-50"
                                title="Stop Instance"
                              >
                                {actionLoading === `kill-${proj.id}` ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              disabled={actionLoading === `delete-proj-${proj.id}`}
                              className="text-[#5f6368] hover:text-[#c5221f] disabled:opacity-50"
                              title="Delete Instance"
                            >
                              {actionLoading === `delete-proj-${proj.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-[#5f6368]">No instances match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IAM Section */}
          {activeSection === 'iam' && (
            <div className="border border-[#dadce0] rounded bg-white overflow-hidden max-w-[1400px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#f8f9fa] border-b border-[#dadce0]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Principal (Email)</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Role</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Quotas</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368]">Auth Provider</th>
                      <th className="px-4 py-2.5 font-medium text-[#5f6368] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dadce0]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#f8f9fa] transition-colors cursor-pointer" onClick={() => { setSelectedUser(u); setShowUserModal(true); }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-medium mr-3">
                              {u.email[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-[#1a73e8]">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold ${u.role === 'ADMIN' ? 'text-[#c5221f]' : 'text-[#5f6368]'}`}>
                            {u.role === 'ADMIN' ? 'Owner / Admin' : 'Editor / User'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5f6368]">
                          {u._count.projects} / {u.serverLimit || 1} Instances
                        </td>
                        <td className="px-4 py-3 text-[#5f6368] capitalize">
                          {u.provider || 'Email/Password'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            className="p-1 hover:bg-black/5 rounded"
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setShowUserModal(true); }}
                          >
                            <MoreVertical size={16} className="text-[#5f6368]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5f6368]">No principals match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <div className="border border-[#dadce0] rounded bg-white">
                <div className="px-6 py-4 border-b border-[#dadce0]">
                  <h2 className="text-lg font-medium text-[#202124]">Platform Settings</h2>
                  <p className="text-sm text-[#5f6368]">Manage global platform configurations and maintenance.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-[#202124] mb-2">Docker System Prune</h3>
                    <p className="text-xs text-[#5f6368] mb-4">Remove unused data (stopped containers, networks, dangling images, and build cache) to free up disk space.</p>
                    <button className="px-4 py-1.5 border border-[#dadce0] text-[#1a73e8] text-sm font-medium rounded hover:bg-[#1a73e8]/5 transition-colors">
                      Run Prune
                    </button>
                  </div>
                  <div className="pt-6 border-t border-[#dadce0]">
                    <h3 className="text-sm font-medium text-[#202124] mb-2">Maintenance Mode</h3>
                    <p className="text-xs text-[#5f6368] mb-4">Block new deployments and logins. Running apps will not be affected.</p>
                    <button className="px-4 py-1.5 border border-[#dadce0] text-[#c5221f] text-sm font-medium rounded hover:bg-[#c5221f]/5 transition-colors">
                      Enable Maintenance Mode
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow-lg w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#dadce0] flex justify-between items-center">
              <h2 className="text-lg font-medium text-[#202124]">
                {selectedUser ? 'Principal details' : 'Add principal'}
              </h2>
              <button onClick={() => setShowUserModal(false)} className="text-[#5f6368] hover:text-[#202124]">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {selectedUser ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] mb-1">Email address</label>
                    <div className="text-sm text-[#202124] font-medium bg-[#f8f9fa] p-2 rounded border border-[#dadce0]">{selectedUser.email}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] mb-1">Username</label>
                    <div className="text-sm text-[#202124] bg-[#f8f9fa] p-2 rounded border border-[#dadce0]">{selectedUser.username}</div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#dadce0] grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5f6368] mb-1">Role</label>
                      <select 
                        value={selectedUser.role} 
                        onChange={(e) => handlePromoteUser(selectedUser.id, e.target.value)}
                        className="w-full text-sm border border-[#dadce0] rounded p-1.5 focus:border-[#1a73e8] outline-none"
                      >
                        <option value="USER">Editor (User)</option>
                        <option value="ADMIN">Owner (Admin)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5f6368] mb-1">Instance Quota</label>
                      <input 
                        type="number" 
                        value={selectedUser.serverLimit} 
                        onChange={(e) => handleUpdateLimit(selectedUser.id, parseInt(e.target.value))}
                        className="w-full text-sm border border-[#dadce0] rounded p-1.5 focus:border-[#1a73e8] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#dadce0]">
                    <button 
                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                      className="text-[#c5221f] text-sm font-medium flex items-center hover:bg-[#fce8e6] px-3 py-1.5 rounded transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete Principal
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] mb-1">Email address *</label>
                    <input 
                      type="email" required 
                      value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full text-sm border border-[#dadce0] rounded p-2 focus:border-[#1a73e8] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] mb-1">Username *</label>
                    <input 
                      type="text" required 
                      value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                      className="w-full text-sm border border-[#dadce0] rounded p-2 focus:border-[#1a73e8] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5f6368] mb-1">Password *</label>
                    <input 
                      type="password" required minLength={6}
                      value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full text-sm border border-[#dadce0] rounded p-2 focus:border-[#1a73e8] outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5f6368] mb-1">Role</label>
                      <select 
                        value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                        className="w-full text-sm border border-[#dadce0] rounded p-2 focus:border-[#1a73e8] outline-none"
                      >
                        <option value="USER">Editor (User)</option>
                        <option value="ADMIN">Owner (Admin)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5f6368] mb-1">Quota</label>
                      <input 
                        type="number" min="0" required
                        value={newUser.serverLimit} onChange={e => setNewUser({...newUser, serverLimit: parseInt(e.target.value)})}
                        className="w-full text-sm border border-[#dadce0] rounded p-2 focus:border-[#1a73e8] outline-none" 
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-1.5 text-sm font-medium text-[#1a73e8] hover:bg-[#1a73e8]/5 rounded">
                      CANCEL
                    </button>
                    <button type="submit" disabled={actionLoading === 'create-user'} className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-medium rounded disabled:opacity-50">
                      SAVE
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
      className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
        active 
          ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium border-l-4 border-[#1a73e8]' 
          : 'text-[#3c4043] hover:bg-[#f1f3f4] border-l-4 border-transparent'
      }`}
    >
      <Icon size={18} className={`mr-3 ${active ? 'text-[#1a73e8]' : 'text-[#5f6368]'}`} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-bold bg-[#dadce0] text-[#3c4043] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function GCPCard({ title, value }: any) {
  return (
    <div className="border border-[#dadce0] rounded p-4 bg-white shadow-sm flex flex-col justify-between h-24">
      <span className="text-xs font-medium text-[#5f6368]">{title}</span>
      <span className="text-3xl font-light text-[#202124]">{value.toLocaleString()}</span>
    </div>
  );
}
