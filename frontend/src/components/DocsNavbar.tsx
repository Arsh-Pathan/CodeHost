"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';

export function DocsNavbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) setIsLoggedIn(true);
    }
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/75 backdrop-blur-2xl px-6 sm:px-8 py-4 flex items-center justify-between border-b border-slate-100/80 transition-all">
      <LogoWithText />
      <div className="hidden md:flex items-center space-x-8">
        <Link href="/#features" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Features</Link>
        <Link href="/#templates" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Templates</Link>
        <Link href="/#pricing" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Pricing</Link>
        <Link href="/docs" className="text-sm font-semibold text-[#2563EB] transition-colors">Docs</Link>
        <Link href="https://discord.gg/gsh2qpEXT4" target="_blank" className="text-sm font-medium text-[#5865F2] hover:text-[#4752C4] transition-colors">Discord</Link>
      </div>
      <div className="flex items-center space-x-3">
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">Login</Link>
            <Link href="/signup" className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
