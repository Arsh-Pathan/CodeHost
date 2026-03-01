"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { Users, Layout, Activity, Database, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  users: number;
  projects: number;
  deployments: number;
  activeContainers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const userRes = await fetchApi('/auth/me');
        
        if (userRes.user.role !== 'ADMIN') {
          setError('Admin privileges required. Please ensure your account has the correct role in the database.');
          setLoading(false);
          return;
        }

        const statsData = await fetchApi('/admin/stats');
        setStats(statsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [router]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Admin Panel...</div>;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-sm border border-red-100">
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
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Console</h1>
            <p className="text-slate-500 mt-1">Platform-wide overview and management</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm transition">
            <ArrowLeft className="-ml-1 mr-1.5 h-4 w-4" /> Exit Admin
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <StatCard title="Total Users" value={stats?.users || 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatCard title="All Projects" value={stats?.projects || 0} icon={Layout} color="text-purple-600" bg="bg-purple-50" />
          <StatCard title="Total Deploys" value={stats?.deployments || 0} icon={Database} color="text-amber-600" bg="bg-amber-50" />
          <StatCard title="Active Apps" value={stats?.activeContainers || 0} icon={Activity} color="text-green-600" bg="bg-green-50" />
        </div>

        {/* Placeholder for deeper management */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
                <div className="space-y-4">
                    <HealthBar label="Database" status="Health Check OK" color="bg-green-500" />
                    <HealthBar label="Redis" status="Connected" color="bg-green-500" />
                    <HealthBar label="Builder Service" status="Ready" color="bg-green-500" />
                    <HealthBar label="Runner Agent" status="Online" color="bg-green-500" />
                </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center">
                 <ShieldAlert className="h-10 w-10 text-slate-300 mb-4" />
                 <h3 className="text-lg font-bold text-slate-900">Advanced Controls</h3>
                 <p className="text-slate-500 mt-1 text-sm max-w-xs mb-6">User list and project management modules can be added here.</p>
                 <button className="bg-slate-50 text-slate-700 px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold opacity-50 cursor-not-allowed">
                    View Registry
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`${bg} p-3 rounded-lg`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, status, color }: any) {
  return (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">{status}</span>
            <div className={`w-2 h-2 rounded-full ${color}`}></div>
        </div>
    </div>
  );
}
