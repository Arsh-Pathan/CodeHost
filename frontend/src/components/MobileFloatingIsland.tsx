"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Zap,
  CreditCard,
  BookOpen,
  ChevronUp,
  X,
  Compass,
  Database,
  Globe,
  Flame,
  ArrowRight,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';

interface MobileFloatingIslandProps {
  isLoggedIn?: boolean;
  serverCount?: number;
}

export function MobileFloatingIsland({ isLoggedIn = false, serverCount = 48 }: MobileFloatingIslandProps) {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Smoothly hide on fast downward scroll, reveal on upward scroll
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY < 100) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY + 15) {
            // Scrolling down fast
            if (!expanded) setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 10) {
            // Scrolling up
            setIsVisible(true);
          }
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, expanded]);

  const scrollToSection = (id: string) => {
    setExpanded(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Expanded Modal Backdrop */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 md:hidden transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Main Floating Island Container */}
      <div
        className={`fixed left-0 right-0 z-50 md:hidden flex justify-center px-3 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          expanded
            ? 'bottom-3'
            : isVisible
            ? 'bottom-3 translate-y-0 opacity-100'
            : 'bottom-0 translate-y-24 opacity-0'
        }`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {expanded ? (
          /* ── Expanded Island Hub ── */
          <div className="pointer-events-auto w-full max-w-sm bg-[#0F172A]/95 backdrop-blur-2xl border border-white/20 text-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200">
            {/* Hub Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/30">
                  CH
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-white">Quick Navigation</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{serverCount} containers live</span>
                </div>
              </div>

              <button
                onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>

            {/* Hub Shortcut Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => scrollToSection('templates')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Rocket size={18} className="text-blue-400" />
                <span className="text-[11px] font-bold text-slate-200">Templates</span>
                <span className="text-[9px] text-blue-300/80 font-mono">1-Click</span>
              </button>

              <button
                onClick={() => scrollToSection('features')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Zap size={18} className="text-yellow-400" />
                <span className="text-[11px] font-bold text-slate-200">Features</span>
                <span className="text-[9px] text-yellow-300/80 font-mono">20+ Stacks</span>
              </button>

              <button
                onClick={() => scrollToSection('pricing')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <CreditCard size={18} className="text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-200">Pricing</span>
                <span className="text-[9px] text-emerald-300/80 font-mono">₹0 Forever</span>
              </button>

              <button
                onClick={() => scrollToSection('databases')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Database size={18} className="text-purple-400" />
                <span className="text-[11px] font-bold text-slate-200">Databases</span>
                <span className="text-[9px] text-purple-300/80 font-mono">Postgres</span>
              </button>

              <button
                onClick={() => scrollToSection('scaletozero')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Layers size={18} className="text-cyan-400" />
                <span className="text-[11px] font-bold text-slate-200">Zero-Idle</span>
                <span className="text-[9px] text-cyan-300/80 font-mono">Auto Sleep</span>
              </button>

              <button
                onClick={() => scrollToSection('faq')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles size={18} className="text-pink-400" />
                <span className="text-[11px] font-bold text-slate-200">FAQ</span>
                <span className="text-[9px] text-pink-300/80 font-mono">Answers</span>
              </button>
            </div>

            {/* Quick External Links (Docs & Discord) */}
            <div className="flex items-center gap-2 mb-4">
              <Link
                href="/docs"
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center space-x-1.5 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
              >
                <BookOpen size={14} className="text-blue-400" />
                <span>Documentation</span>
              </Link>
              <Link
                href="https://discord.gg/gsh2qpEXT4"
                target="_blank"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 hover:bg-[#5865F2]/30 flex items-center justify-center space-x-1.5 text-xs font-semibold text-[#8B98FF] transition-all cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>Discord</span>
              </Link>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <Link
                href={isLoggedIn ? '/dashboard' : '/signup'}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{isLoggedIn ? 'Open Dashboard' : 'Deploy Free Project (₹0)'}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* ── Collapsed Dynamic Floating Island Pill ── */
          <div className="pointer-events-auto bg-[#0F172A]/92 backdrop-blur-2xl border border-white/20 text-white shadow-[0_12px_40px_rgba(0,0,0,0.55)] rounded-full px-2.5 py-1.5 flex items-center space-x-1.5 max-w-[95vw] sm:max-w-md">
            {/* Live Indicator Pill */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 tracking-wide font-mono">
                {serverCount}
              </span>
            </div>

            {/* Quick Jumps */}
            <div className="flex items-center space-x-0.5">
              <button
                onClick={() => scrollToSection('templates')}
                className="px-2.5 py-1.5 rounded-full hover:bg-white/10 active:scale-95 text-[11px] font-bold text-slate-300 hover:text-white transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Rocket size={13} className="text-blue-400" />
                <span className="hidden xs:inline">Templates</span>
              </button>

              <button
                onClick={() => scrollToSection('pricing')}
                className="px-2.5 py-1.5 rounded-full hover:bg-white/10 active:scale-95 text-[11px] font-bold text-slate-300 hover:text-white transition-all flex items-center space-x-1 cursor-pointer"
              >
                <CreditCard size={13} className="text-emerald-400" />
                <span className="hidden xs:inline">Pricing</span>
              </button>

              <Link
                href="/docs"
                className="px-2.5 py-1.5 rounded-full hover:bg-white/10 active:scale-95 text-[11px] font-bold text-slate-300 hover:text-white transition-all flex items-center space-x-1 cursor-pointer"
              >
                <BookOpen size={13} className="text-blue-300" />
                <span className="hidden sm:inline">Docs</span>
              </Link>
            </div>

            {/* Main Action Pill */}
            <Link
              href={isLoggedIn ? '/dashboard' : '/signup'}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[11px] font-black tracking-wide transition-all shadow-md shadow-blue-500/30 active:scale-95 flex items-center space-x-1 flex-shrink-0 cursor-pointer"
            >
              <span>{isLoggedIn ? 'Dashboard' : 'Deploy'}</span>
              <ArrowRight size={11} />
            </Link>

            {/* Expand Island Button */}
            <button
              onClick={() => setExpanded(true)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-slate-300 hover:text-white transition-all flex-shrink-0 cursor-pointer"
              aria-label="Expand floating menu"
            >
              <ChevronUp size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
