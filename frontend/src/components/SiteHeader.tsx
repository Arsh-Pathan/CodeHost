"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { LogoWithText } from '@/components/Logo';

export function SiteHeader() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isHiddenRoute =
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/auth/callback');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsLoggedIn(Boolean(token));
    }
  }, [pathname]);

  if (isHiddenRoute) return null;

  return (
    <div className="fixed top-0 w-full z-50 print:hidden">
      <nav className="w-full bg-white/85 backdrop-blur-2xl px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-100/80 transition-all">
        <div className="scale-90 sm:scale-100 origin-left">
          <LogoWithText href="/" />
        </div>

        <div className="hidden lg:flex items-center space-x-7 xl:space-x-9">
          <Link
            href={pathname === '/' ? '#features' : '/#features'}
            className="text-xs xl:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Features
          </Link>
          <Link
            href={pathname === '/' ? '#pricing' : '/#pricing'}
            className="text-xs xl:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className={`text-xs xl:text-sm font-semibold transition-colors ${
              pathname === '/docs' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Docs
          </Link>
          <Link
            href="/terms"
            className={`text-xs xl:text-sm font-semibold transition-colors ${
              pathname === '/terms' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terms
          </Link>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <Link
            href="https://discord.gg/gsh2qpEXT4"
            target="_blank"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20 text-xs font-bold transition-colors"
          >
            <MessageSquare size={13} />
            <span>Discord</span>
          </Link>

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
