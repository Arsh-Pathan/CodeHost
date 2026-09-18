"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import PanelLayout from '@/components/PanelLayout';
import { 
  User, 
  Mail, 
  Server, 
  Shield, 
  Loader2, 
  Key, 
  Github, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Palette,
  CheckCircle2
} from 'lucide-react';

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

const AVATAR_STYLES = [
  { id: 'notionists', label: 'Notion Illustrator', icon: '🎨' },
  { id: 'adventurer', label: 'Adventurer', icon: '🧑‍🎨' },
  { id: 'bottts', label: 'Tech Robot', icon: '🤖' },
  { id: 'lorelei', label: 'Modern Art', icon: '🌸' },
  { id: 'fun-emoji', label: 'Fun Emoji', icon: '✨' },
  { id: 'github', label: 'GitHub Avatar', icon: '🐙' },
  { id: 'initials', label: 'Letter Monogram', icon: '🔤' },
] as const;

type AvatarStyleId = typeof AVATAR_STYLES[number]['id'];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyleId>('notionists');
  const [avatarSeed, setAvatarSeed] = useState<string>('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((res) => {
        setUser(res.user);
        const storedStyle = (localStorage.getItem('codehost_avatar_style') as AvatarStyleId) || 'notionists';
        const storedSeed = localStorage.getItem('codehost_avatar_seed') || res.user?.username || res.user?.email || 'developer';
        setAvatarStyle(storedStyle);
        setAvatarSeed(storedSeed);
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const selectAvatarStyle = (style: AvatarStyleId) => {
    setAvatarStyle(style);
    localStorage.setItem('codehost_avatar_style', style);
    if (!avatarSeed && user) {
      const seed = user.username || user.email || 'developer';
      setAvatarSeed(seed);
      localStorage.setItem('codehost_avatar_seed', seed);
    }
    window.dispatchEvent(new Event('codehost_avatar_changed'));
    showSavedNotification();
  };

  const shuffleSeed = () => {
    const randomWords = ['cyber', 'quantum', 'stellar', 'rocket', 'pixel', 'vortex', 'turbo', 'spark', 'cloud', 'blaze'];
    const newSeed = `${user?.username || 'user'}-${randomWords[Math.floor(Math.random() * randomWords.length)]}-${Math.floor(Math.random() * 900 + 100)}`;
    setAvatarSeed(newSeed);
    localStorage.setItem('codehost_avatar_seed', newSeed);
    window.dispatchEvent(new Event('codehost_avatar_changed'));
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const getAvatarUrl = (style: AvatarStyleId, seed: string) => {
    if (style === 'github') {
      return `https://github.com/${user?.username || 'github'}.png`;
    }
    if (style === 'initials') {
      return null;
    }
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed || user?.username || 'developer')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  if (loading) {
    return (
      <PanelLayout user={user} projectName="Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </PanelLayout>
    );
  }

  const currentAvatarUrl = getAvatarUrl(avatarStyle, avatarSeed);
  const isGoogleConnected = user?.provider === 'google' || user?.email?.endsWith('@gmail.com');
  const isGithubConnected = user?.provider === 'github';

  return (
    <PanelLayout user={user} projectName="Profile">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Profile Header & Illustrator Customizer */}
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative overflow-hidden">
          {isSavedNotice && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 size={13} />
              <span>Avatar Updated!</span>
            </div>
          )}

          {/* Avatar Display Frame */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative group">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-blue-500/20 via-indigo-500/10 to-purple-500/20 p-1.5 ring-4 ring-blue-500/15 shadow-xl flex items-center justify-center overflow-hidden">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={user?.name || user?.username}
                    className="w-full h-full rounded-full object-cover bg-white"
                    onError={(e) => {
                      // Fallback to initials if image fails
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-4xl sm:text-5xl shadow-inner">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>

              {/* Quick Shuffle button on top of avatar */}
              {avatarStyle !== 'github' && avatarStyle !== 'initials' && (
                <button
                  onClick={shuffleSeed}
                  title="Roll random illustration"
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#0F172A] text-white hover:bg-blue-600 active:scale-90 flex items-center justify-center shadow-lg border-2 border-white transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            {avatarStyle !== 'github' && avatarStyle !== 'initials' && (
              <button
                onClick={shuffleSeed}
                className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1.5 cursor-pointer bg-blue-50 px-3 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-all active:scale-95"
              >
                <Sparkles size={12} />
                <span>Shuffle Artwork</span>
              </button>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 w-full">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{user?.name || user?.username}</h1>
            <p className="text-slate-500 font-medium text-sm">@{user?.username}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 pt-1">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center">
                <Shield size={12} className="mr-1.5" />
                {user?.role}
              </span>
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center ${user?.emailVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {user?.emailVerified ? 'Email Verified' : 'Email Unverified'}
              </span>
              {user?.tier && (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                  {user.tier} Tier
                </span>
              )}
            </div>

            {/* Avatar Style Picker Pills */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center justify-center md:justify-start space-x-1">
                <Palette size={12} />
                <span>Choose Avatar Artwork Style:</span>
              </label>

              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {AVATAR_STYLES.map((style) => {
                  const isSelected = avatarStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => selectAvatarStyle(style.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <span>{style.icon}</span>
                      <span>{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Account Details & Authentication */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
              <User size={16} className="mr-2 text-blue-600" />
              Account Details
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Email Address</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-bold text-slate-900 truncate">{user?.email}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Server Limit</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3">
                  <Server size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-bold text-slate-900">{user?.serverLimit || 1} Projects Max</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Member Since</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-900">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'July 12, 2026'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
                <Key size={16} className="mr-2 text-purple-600" />
                Authentication
              </h2>
              <div className="space-y-4">
                {/* Google Account Card */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isGoogleConnected ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 opacity-70'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                      <GoogleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Google Account</span>
                      <span className="text-xs font-medium text-slate-500">
                        {isGoogleConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  {isGoogleConnected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  )}
                </div>

                {/* GitHub Account Card */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isGithubConnected ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 opacity-70'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                      <Github size={20} className="text-slate-900" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">GitHub Account</span>
                      <span className="text-xs font-medium text-slate-500">
                        {isGithubConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  {isGithubConnected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  )}
                </div>
              </div>
            </div>

            <button disabled className="mt-8 w-full py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all cursor-not-allowed">
              Change Password
            </button>
          </div>
        </div>

      </div>
    </PanelLayout>
  );
}
