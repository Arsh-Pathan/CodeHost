"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Code, 
  LayoutDashboard, 
  Activity, 
  Settings, 
  LogOut, 
  ChevronRight,
  Menu,
  X,
  User,
  ExternalLink,
  Plus
} from 'lucide-react';

interface PanelLayoutProps {
  children: React.ReactNode;
  user: { email: string; username: string; role: string } | null;
  projectName?: string;
}

export default function PanelLayout({ children, user, projectName }: PanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    router.push('/');
  };

  const navItems = [
    { name: 'Projects', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Usage', icon: Activity, href: '/dashboard/usage', disabled: true },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', disabled: true },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0d1117] text-slate-300 transition-all duration-300 ease-in-out border-r border-[#30363d] flex flex-col fixed h-full z-30`}
      >
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Code className="h-5 w-5 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="text-xl font-bold tracking-tight text-white">CodeHost</span>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.disabled ? '#' : item.href}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                    : 'hover:bg-[#161b22] hover:text-white'}
                  ${item.disabled ? 'opacity-50 cursor-not-allowed hidden' : ''}
                `}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                {isSidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#30363d] mt-auto">
          {isSidebarOpen ? (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3 px-2">
                <div className="w-9 h-9 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-blue-400 font-bold uppercase ring-2 ring-blue-500/20">
                  {user?.username ? user.username[0] : user?.email[0]}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{user?.username || 'User'}</span>
                  <span className="text-xs text-slate-500 truncate">{user?.email}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <LogOut size={18} />
                <span className="font-medium text-sm text-inherit">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 ease-in-out`}>
        {/* Header / Top bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-16 flex items-center justify-between px-8">
          <div className="flex items-center space-x-4 text-sm text-slate-500 font-medium">
             <Link href="/dashboard" className="hover:text-blue-600 transition">Dashboard</Link>
             <ChevronRight size={14} className="text-slate-300" />
             <span className="text-slate-900 font-semibold">{projectName || 'Projects'}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user?.role === 'ADMIN' && (
              <Link href="/admin">
                <button className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition border border-blue-200">
                  Admin Panel
                </button>
              </Link>
            )}
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-50 rounded-lg"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
