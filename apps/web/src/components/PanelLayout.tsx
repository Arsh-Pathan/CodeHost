"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo, LogoWithText } from './Logo';
import { 
  LayoutDashboard, 
  Activity, 
  Settings, 
  LogOut, 
  ChevronRight,
  Menu,
  X,
  Plus,
  Compass,
  CreditCard,
  LifeBuoy
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
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Explore Templates', icon: Compass, href: '#', disabled: true },
    { name: 'Billing', icon: CreditCard, href: '#', disabled: true },
    { name: 'Project Settings', icon: Settings, href: '#', disabled: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white text-slate-600 transition-all duration-300 ease-in-out border-r border-slate-200 flex flex-col fixed h-full z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}
      >
        <div className="p-6 flex items-center space-x-3 mb-4">
          <Logo className="w-8 h-8 shrink-0" />
          {isSidebarOpen && (
            <span className="text-xl font-black tracking-tight text-slate-900">
              Code<span className="text-blue-600">Host</span>
            </span>
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
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 font-bold' 
                    : 'hover:bg-slate-50 hover:text-slate-900'}
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <Icon size={18} className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                {isSidebarOpen && <span className="text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          {isSidebarOpen ? (
            <div className="flex flex-col space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs ring-4 ring-blue-500/5">
                  {user?.username ? user.username[0] : user?.email[0]}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 truncate">{user?.username || 'User'}</span>
                  <span className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{user?.email}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                 <button className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-900 transition-all text-xs font-bold">
                    <LifeBuoy size={16} />
                    <span>Support</span>
                 </button>
                 <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xs font-bold"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 ease-in-out flex flex-col`}>
        {/* Header / Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 h-16 flex items-center justify-between px-8">
          <div className="flex items-center space-x-3">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <div className="flex items-center space-x-2 text-xs font-bold">
                 <Link href="/dashboard" className="text-slate-400 hover:text-blue-600 transition">Console</Link>
                 <ChevronRight size={12} className="text-slate-300" />
                 <span className="text-slate-900 uppercase tracking-widest">{projectName || 'General'}</span>
              </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user?.role === 'ADMIN' && (
              <Link href="/admin">
                <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition border border-blue-200 shadow-sm">
                  Admin
                </button>
              </Link>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
               <span className="text-[10px] font-black">{user?.username?.[0] || 'U'}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-10 max-w-[1400px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
