"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  Package,
  Sparkles,
  CreditCard,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface MobileFloatingIslandProps {
  isLoggedIn?: boolean;
  serverCount?: number;
}

export function MobileFloatingIsland({ isLoggedIn = false }: MobileFloatingIslandProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'templates' | 'features' | 'pricing'>('home');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Track active section and hide on fast downward scroll, reveal on upward scroll
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Scroll direction visibility
          if (currentScrollY < 80) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY + 20) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 10) {
            setIsVisible(true);
          }
          setLastScrollY(currentScrollY);

          // Active section highlight
          const templatesEl = document.getElementById('templates');
          const featuresEl = document.getElementById('features');
          const pricingEl = document.getElementById('pricing');

          const scrollPosition = currentScrollY + 200;

          if (pricingEl && scrollPosition >= pricingEl.offsetTop) {
            setActiveTab('pricing');
          } else if (featuresEl && scrollPosition >= featuresEl.offsetTop) {
            setActiveTab('features');
          } else if (templatesEl && scrollPosition >= templatesEl.offsetTop) {
            setActiveTab('templates');
          } else {
            setActiveTab('home');
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (id: string, tab: 'home' | 'templates' | 'features' | 'pricing') => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 z-50 md:hidden flex justify-center px-4 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible
          ? 'bottom-3 translate-y-0 opacity-100'
          : 'bottom-0 translate-y-24 opacity-0'
      }`}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Modern White-Theme Floating Dock Island */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_8px_32px_rgba(15,23,42,0.12)] rounded-full px-2 py-1.5 flex items-center space-x-1 max-w-[96vw]">
        
        {/* Home Tab (Active circular indicator pill) */}
        <button
          onClick={() => scrollToSection('hero', 'home')}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'bg-[#0F172A] text-white shadow-xs scale-102'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          aria-label="Home"
          title="Home"
        >
          <Home size={17} />
        </button>

        {/* Templates Tab */}
        <button
          onClick={() => scrollToSection('templates', 'templates')}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-[#0F172A] text-white shadow-xs scale-102'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          aria-label="Templates"
          title="Templates"
        >
          <Package size={17} />
        </button>

        {/* Features Tab */}
        <button
          onClick={() => scrollToSection('features', 'features')}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'features'
              ? 'bg-[#0F172A] text-white shadow-xs scale-102'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          aria-label="Features"
          title="Features"
        >
          <Sparkles size={17} />
        </button>

        {/* Pricing Tab */}
        <button
          onClick={() => scrollToSection('pricing', 'pricing')}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-[#0F172A] text-white shadow-xs scale-102'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          aria-label="Pricing"
          title="Pricing"
        >
          <CreditCard size={17} />
        </button>

        {/* Docs Link */}
        <Link
          href="/docs"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          aria-label="Documentation"
          title="Docs"
        >
          <BookOpen size={17} />
        </Link>

        {/* Subtle Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        {/* Action Button: Dashboard or Deploy */}
        <Link
          href={isLoggedIn ? '/dashboard' : '/signup'}
          className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-full text-xs font-bold tracking-tight transition-all shadow-xs active:scale-95 flex items-center space-x-1 flex-shrink-0 cursor-pointer"
        >
          <span>{isLoggedIn ? 'Dashboard' : 'Deploy'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
