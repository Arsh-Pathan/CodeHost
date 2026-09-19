"use client";

import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';

export function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

export interface UserAvatarProps {
  user?: {
    username?: string;
    email?: string;
    name?: string | null;
    avatarUrl?: string | null;
    provider?: string | null;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  preference?: 'google' | 'github' | 'auto';
  showBadge?: boolean;
  className?: string;
}

export default function UserAvatar({
  user,
  size = 'md',
  preference,
  showBadge = true,
  className = '',
}: UserAvatarProps) {
  const [selectedPref, setSelectedPref] = useState<'google' | 'github'>('google');
  const [attemptStage, setAttemptStage] = useState<'primary' | 'secondary' | 'fallback'>('primary');

  useEffect(() => {
    const updatePref = () => {
      if (preference && preference !== 'auto') {
        setSelectedPref(preference);
      } else {
        const stored = localStorage.getItem('codehost_avatar_type');
        if (stored === 'github') {
          setSelectedPref('github');
        } else {
          // Default: Prefer Google first
          setSelectedPref('google');
        }
      }
      setAttemptStage('primary');
    };

    updatePref();
    window.addEventListener('codehost_avatar_changed', updatePref);
    return () => window.removeEventListener('codehost_avatar_changed', updatePref);
  }, [preference, user]);

  const username = user?.username || 'user';
  const initial = (user?.name || user?.username || user?.email || 'U').charAt(0).toUpperCase();

  const isGoogleAvatar = user?.avatarUrl?.includes('googleusercontent.com');
  const googleImg = isGoogleAvatar ? user?.avatarUrl : (user?.provider === 'google' ? user?.avatarUrl : null);
  const githubImg = user?.provider === 'github' && user?.avatarUrl 
    ? user.avatarUrl 
    : `https://github.com/${username}.png`;

  let primarySrc: string | null = null;
  let secondarySrc: string | null = null;
  let activeType: 'google' | 'github' = selectedPref;

  if (selectedPref === 'google') {
    primarySrc = googleImg || null;
    secondarySrc = githubImg;
  } else {
    primarySrc = githubImg;
    secondarySrc = googleImg || null;
  }

  let currentImgSrc: string | null = null;
  if (attemptStage === 'primary') {
    currentImgSrc = primarySrc || secondarySrc;
    if (!primarySrc && secondarySrc) {
      activeType = selectedPref === 'google' ? 'github' : 'google';
    }
  } else if (attemptStage === 'secondary') {
    currentImgSrc = secondarySrc;
    activeType = selectedPref === 'google' ? 'github' : 'google';
  } else {
    currentImgSrc = null;
  }

  const handleImageError = () => {
    if (attemptStage === 'primary' && secondarySrc && currentImgSrc !== secondarySrc) {
      setAttemptStage('secondary');
    } else {
      setAttemptStage('fallback');
    }
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-28 h-28 sm:w-36 sm:h-36 text-3xl sm:text-4xl',
  };

  const badgeSizes = {
    xs: 'w-3 h-3 -bottom-0.5 -right-0.5 p-0.5',
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 p-0.5',
    md: 'w-4 h-4 -bottom-1 -right-1 p-0.5',
    lg: 'w-5 h-5 -bottom-1 -right-1 p-1',
    xl: 'w-8 h-8 sm:w-10 sm:h-10 -bottom-1 -right-1 p-1.5 sm:p-2',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
    xl: 'w-12 h-12 sm:w-16 sm:h-16',
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full overflow-hidden flex items-center justify-center font-black select-none
          border border-slate-200/80 shadow-xs transition-all duration-200
          ${currentImgSrc ? 'bg-slate-100' : (activeType === 'google' ? 'bg-blue-600 text-white' : 'bg-[#0F172A] text-white')}
        `}
      >
        {currentImgSrc ? (
          <img
            src={currentImgSrc}
            alt={user?.username || 'User Avatar'}
            className="w-full h-full object-cover"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            {activeType === 'google' ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                {size === 'xl' ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="leading-none">{initial}</span>
                    <span className="text-[11px] font-semibold tracking-wider text-blue-100 uppercase">Google Account</span>
                  </div>
                ) : (
                  <span className="leading-none">{initial}</span>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0F172A] text-white font-bold">
                {size === 'xl' ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Github className="w-12 h-12 text-slate-100" />
                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">GitHub Account</span>
                  </div>
                ) : (
                  <Github className={iconSizes[size]} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showBadge && (
        <div
          className={`
            absolute ${badgeSizes[size]} rounded-full bg-white border border-slate-200 shadow-sm
            flex items-center justify-center shrink-0 z-10
          `}
          title={activeType === 'google' ? 'Google Account' : 'GitHub Account'}
        >
          {activeType === 'google' ? (
            <GoogleIcon className="w-full h-full" />
          ) : (
            <Github className="w-full h-full text-slate-900" />
          )}
        </div>
      )}
    </div>
  );
}
