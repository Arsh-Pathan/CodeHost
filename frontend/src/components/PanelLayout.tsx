"use client";

import React, { useState, useEffect } from 'react';
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
import UserAvatar from './UserAvatar';

interface PanelLayoutProps {
  children: React.ReactNode;
  user: {
    email: string;
    username: string;
    role: string;
    name?: string | null;
    avatarUrl?: string | null;
    provider?: string | null;
  } | null;
  projectName?: string;
}

export default function PanelLayout({ children, user, projectName }: PanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    router.push('/');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Explore Templates', icon: Compass, href: '#', disabled: true },
    { name: 'Billing', icon: CreditCard, href: '/dashboard/billing' },
    { name: 'Profile', icon: Settings, href: '/dashboard/profile' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#0F172A] selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-white text-slate-600 transition-all duration-300 ease-in-out border-r border-slate-200 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.04)]
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}
        `}
      >
        <div className="p-5 sm:p-6 flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Logo className="w-8 h-8 shrink-0" />
            <span className={`text-xl font-black tracking-tight text-[#0F172A] ${!isSidebarOpen && 'md:hidden'}`}>
              Code<span className="text-[#2563EB]">Host</span>
            </span>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.disabled ? '#' : item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group
                  ${isActive 
                    ? 'bg-blue-50 text-[#2563EB] font-bold shadow-xs' 
                    : 'hover:bg-slate-50 hover:text-[#0F172A]'}
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <Icon size={18} className={`${isActive ? 'text-[#2563EB]' : 'text-slate-400 group-hover:text-slate-600'} transition-colors shrink-0`} />
                <span className={`text-sm ${!isSidebarOpen && 'md:hidden'}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <div className="flex flex-col space-y-4">
            <div className={`p-3 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center space-x-3 ${!isSidebarOpen && 'md:hidden'}`}>
              <UserAvatar user={user} size="md" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-[#0F172A] truncate">{user?.name || user?.username || 'Developer'}</span>
                <span className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{user?.email}</span>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
               <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#0F172A] transition-all text-xs font-bold">
                  <LifeBuoy size={16} className="shrink-0" />
                  <span className={`${!isSidebarOpen && 'md:hidden'}`}>Support</span>
               </button>
               <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#E53935] hover:bg-red-50 transition-all text-xs font-bold"
              >
                <LogOut size={16} className="shrink-0" />
                <span className={`${!isSidebarOpen && 'md:hidden'}`}>Logout</span>
              </button>
            </div>
          </div>
          <div className={`mt-4 pt-3 border-t border-slate-100 flex flex-col items-center justify-center space-y-1.5 opacity-60 hover:opacity-100 transition-opacity ${!isSidebarOpen && 'md:hidden'}`}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Core hosted powered by</span>
            <div className="flex items-center space-x-1.5">
              <img src="/csky-logo.png" alt="CSky Developments" className="h-3.5 w-auto object-contain" />
              <span className="text-[10px] font-black text-slate-500 tracking-tight">CSky Developments</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 w-full min-w-0 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header / Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-2 sm:space-x-3">
             {/* Mobile Hamburger */}
             <button 
                onClick={() => setIsMobileOpen(true)} 
                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg active:scale-95 transition-all"
                aria-label="Open mobile menu"
              >
                <Menu size={20} />
              </button>

             {/* Desktop Collapse Toggle */}
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="hidden md:flex p-2 -ml-2 text-slate-400 hover:text-[#0F172A] transition-all hover:bg-slate-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <div className="h-5 w-px bg-slate-200 mx-1 sm:mx-2" />
              <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold truncate">
                 <Link href="/dashboard" className="text-slate-400 hover:text-[#2563EB] transition">Console</Link>
                 <ChevronRight size={12} className="text-slate-300 shrink-0" />
                 <span className="text-[#0F172A] uppercase tracking-widest truncate">{projectName || 'General'}</span>
              </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user?.role === 'ADMIN' && (
              <Link href="/admin">
                <button className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] bg-blue-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-blue-100 transition border border-blue-200 shadow-xs">
                  Admin
                </button>
              </Link>
            )}
            <Link
              href="/dashboard/profile"
              title="View Profile"
              className="hover:scale-105 transition-all inline-flex items-center justify-center"
            >
              <UserAvatar user={user} size="sm" />
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-10 max-w-[1400px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
