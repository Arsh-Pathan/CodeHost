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
  LifeBuoy,
  Github
} from 'lucide-react';

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

interface PanelLayoutProps {
  children: React.ReactNode;
  user: { email: string; username: string; role: string } | null;
  projectName?: string;
}

export default function PanelLayout({ children, user, projectName }: PanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [avatarType, setAvatarType] = useState<'google' | 'github'>('google');

  useEffect(() => {
    const updateAvatar = () => {
      const stored = localStorage.getItem('codehost_avatar_type');
      if (stored === 'google' || stored === 'github') {
        setAvatarType(stored as 'google' | 'github');
      } else if ((user as any)?.provider === 'github') {
        setAvatarType('github');
      } else {
        setAvatarType('google');
      }
    };

    updateAvatar();
    window.addEventListener('codehost_avatar_changed', updateAvatar);
    return () => window.removeEventListener('codehost_avatar_changed', updateAvatar);
  }, [user]);

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
              <div className="w-9 h-9 rounded-full bg-white text-slate-800 flex items-center justify-center ring-4 ring-slate-100 shrink-0 overflow-hidden border border-slate-200 p-1.5 shadow-xs">
                {avatarType === 'google' ? (
                  <GoogleIcon className="w-full h-full" />
                ) : (
                  <Github className="w-full h-full text-slate-900" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-[#0F172A] truncate">{user?.username || 'Developer'}</span>
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
              className="w-8 h-8 rounded-full bg-white text-slate-800 border border-slate-200 ring-2 ring-slate-100 flex items-center justify-center shadow-xs overflow-hidden hover:scale-105 transition-all p-1.5"
            >
              {avatarType === 'google' ? (
                <GoogleIcon className="w-full h-full" />
              ) : (
                <Github className="w-full h-full text-slate-900" />
              )}
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
