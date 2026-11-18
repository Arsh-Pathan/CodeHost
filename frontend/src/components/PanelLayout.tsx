"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ChevronRight,
  Menu,
  X,
  Compass,
  CreditCard,
  LifeBuoy,
  Gift,
  Coins,
  Plus
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import CreditTopUpModal from './CreditTopUpModal';
import { fetchApi } from '@/lib/api';

interface PanelLayoutProps {
  children: React.ReactNode;
  user: {
    email: string;
    username: string;
    role: string;
    name?: string | null;
    avatarUrl?: string | null;
    provider?: string | null;
    tier?: string;
  } | null;
  projectName?: string;
  walletBalance?: number;
  onBalanceUpdate?: (newBalance: number) => void;
}

export default function PanelLayout({ 
  children, 
  user, 
  projectName, 
  walletBalance, 
  onBalanceUpdate 
}: PanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [balance, setBalance] = useState<number>(walletBalance ?? 0);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  useEffect(() => {
    if (walletBalance !== undefined) {
      setBalance(walletBalance);
    }
  }, [walletBalance]);

  useEffect(() => {
    if (user && walletBalance === undefined) {
      fetchApi('/billing/wallet')
        .then((data) => {
          if (data?.wallet?.balance !== undefined) {
            setBalance(data.wallet.balance);
          }
        })
        .catch(() => {});
    }
  }, [user, walletBalance]);

  const handleTopUpSuccess = (newBalance: number) => {
    setBalance(newBalance);
    onBalanceUpdate?.(newBalance);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('codehost_user_cache');
    localStorage.removeItem('codehost_projects_cache');
    localStorage.removeItem('codehost_wallet_cache');
    router.push('/');
  };

  const navItems: Array<{ name: string; icon: any; href: string; badge?: string; disabled?: boolean }> = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'New Server', icon: Plus, href: '/dashboard/new' },
    { name: 'Billing', icon: CreditCard, href: '/dashboard/billing' },
    { name: 'Refer & Earn', icon: Gift, href: '/dashboard/referrals', badge: 'Bonus' },
    { name: 'Docs & MCP', icon: Compass, href: '/docs' },
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
          <Link href="/dashboard" className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity">
            <Logo className="w-8 h-8 shrink-0" />
            <span className={`text-xl font-black tracking-tight text-[#0F172A] ${!isSidebarOpen && 'md:hidden'}`}>
              Code<span className="text-brand-gradient">Host</span>
            </span>
          </Link>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close menu"
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
                {item.badge && isSidebarOpen && (
                  <span className={`ml-auto text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-blue-50 text-blue-600'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <div className="flex flex-col space-y-3">
            {/* Plan & Credits Status Card */}
            {isSidebarOpen && (
              <div className="p-3 bg-gradient-to-br from-blue-50/60 to-slate-50 rounded-2xl border border-blue-100/80 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    {user?.tier ? `${user.tier.toUpperCase()} TIER` : 'FREE TIER'}
                  </span>
                  <div className="flex items-center space-x-1 text-slate-700 font-black text-xs">
                    <Coins size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                    <span>{balance ?? 0}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mb-2.5">
                  {balance === 0 ? '0 credits remaining. Top up to keep services running.' : `${balance} compute credits available.`}
                </p>
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(true)}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Top Up Credits</span>
                </button>
              </div>
            )}

            <div className={`p-3 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center space-x-3 ${!isSidebarOpen && 'md:hidden'}`}>
              <UserAvatar user={user} size="md" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-[#0F172A] truncate">{user?.name || user?.username || 'Developer'}</span>
                <span className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{user?.email}</span>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
               <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#0F172A] transition-all text-xs font-bold cursor-pointer">
                  <LifeBuoy size={16} className="shrink-0" />
                  <span className={`${!isSidebarOpen && 'md:hidden'}`}>Support</span>
               </button>
               <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#E53935] hover:bg-red-50 transition-all text-xs font-bold cursor-pointer"
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
      <main className={`flex-1 w-full min-w-0 transition-all duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header / Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
             {/* Mobile Hamburger */}
             <button 
                onClick={() => setIsMobileOpen(true)} 
                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg active:scale-95 transition-all cursor-pointer"
                aria-label="Open mobile menu"
              >
                <Menu size={20} />
              </button>

             {/* Desktop Collapse Toggle */}
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="hidden md:flex p-2 -ml-2 text-slate-400 hover:text-[#0F172A] transition-all hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>
              <div className="h-5 w-px bg-slate-200 mx-1 sm:mx-2 shrink-0" />
              <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold truncate">
                 <Link href="/dashboard" className="text-slate-400 hover:text-[#2563EB] transition shrink-0">Console</Link>
                 <ChevronRight size={12} className="text-slate-300 shrink-0" />
                 <span className="text-[#0F172A] uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">{projectName || 'General'}</span>
              </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Header Credit Balance Pill */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/90 hover:border-slate-300 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-2xs">
              <Coins size={14} className="text-amber-500 fill-amber-500 shrink-0" />
              <span className="text-xs font-black text-slate-800 tabular-nums">
                {balance ?? 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">credits</span>
              <button
                type="button"
                onClick={() => setIsTopUpOpen(true)}
                className="ml-1 sm:ml-1.5 inline-flex items-center space-x-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus size={10} />
                <span>Buy</span>
              </button>
            </div>

            {user?.role === 'ADMIN' && (
              <Link href="/admin">
                <button className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] bg-blue-50 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-blue-100 transition border border-blue-200 shadow-xs cursor-pointer">
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

        <div className="p-3 sm:p-6 md:p-10 pb-24 md:pb-10 max-w-[1400px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Native App Feel) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-3 py-1.5 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {[
          { name: 'Console', icon: LayoutDashboard, href: '/dashboard' },
          { name: 'Billing', icon: CreditCard, href: '/dashboard/billing' },
          { name: 'Refer & Earn', icon: Gift, href: '/dashboard/referrals', badge: '+100' },
          { name: 'Profile', icon: Settings, href: '/dashboard/profile' },
        ].map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative ${
                isActive ? 'text-[#2563EB] font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon size={19} className={isActive ? 'text-[#2563EB]' : 'text-slate-400'} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-3.5 text-[8px] font-black bg-blue-600 text-white px-1 rounded-full leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[70px]">{tab.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global Credit Top-Up Modal */}
      <CreditTopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={handleTopUpSuccess}
      />
    </div>
  );
}
