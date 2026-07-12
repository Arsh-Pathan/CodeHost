"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import PanelLayout from '@/components/PanelLayout';
import { User, Mail, Server, Shield, Loader2, Key, Github } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((res) => {
        setUser(res.user);
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <PanelLayout user={user} projectName="Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout user={user} projectName="Profile">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Profile Header */}
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-5xl ring-8 ring-blue-500/10">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-3xl font-black text-slate-900">{user?.name || user?.username}</h1>
            <p className="text-slate-500 font-medium">@{user?.username}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center">
                <Shield size={12} className="mr-1.5" />
                {user?.role}
              </span>
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center ${user?.emailVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {user?.emailVerified ? 'Email Verified' : 'Email Unverified'}
              </span>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <User size={16} className="mr-2 text-blue-600" />
              Account Details
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Email Address</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
                  <Mail size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">{user?.email}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Server Limit</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
                  <Server size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">{user?.serverLimit} Projects Max</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Member Since</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-900">{new Date(user?.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                <Key size={16} className="mr-2 text-purple-600" />
                Authentication
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                      <img src="/google-icon.svg" alt="Google" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Google Account</span>
                      <span className="text-xs font-medium text-slate-500">Connected</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between opacity-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                      <Github size={20} className="text-slate-800" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">GitHub Account</span>
                      <span className="text-xs font-medium text-slate-500">Not Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button disabled className="mt-8 w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all">
              Change Password
            </button>
          </div>
        </div>

      </div>
    </PanelLayout>
  );
}
