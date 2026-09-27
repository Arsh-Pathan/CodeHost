"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  CheckCircle2,
  Award,
  ExternalLink,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import UserAvatar, { GoogleIcon } from '@/components/UserAvatar';

type AvatarType = 'google' | 'github';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [avatarType, setAvatarType] = useState<AvatarType>('google');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const [certStatus, setCertStatus] = useState<{
    claimed: boolean;
    eligible: boolean;
    certificate: any;
    qualifyingProject?: string | null;
  } | null>(null);
  const [claimingCert, setClaimingCert] = useState(false);
  const [copiedCertLink, setCopiedCertLink] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApi('/auth/me'),
      fetchApi('/certificates/my-status').catch(() => null),
    ])
      .then(([authRes, certRes]) => {
        setUser(authRes.user);
        if (certRes) {
          setCertStatus(certRes);
        }
        const stored = localStorage.getItem('codehost_avatar_type') as AvatarType;
        if (stored === 'google' || stored === 'github') {
          setAvatarType(stored);
        } else {
          // Default: Prefer Google first, fall back to GitHub
          setAvatarType('google');
        }
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleClaimCertificate = async () => {
    setClaimingCert(true);
    try {
      const res = await fetchApi('/certificates/claim', { method: 'POST' });
      if (res.success && res.certificate) {
        setCertStatus({
          claimed: true,
          eligible: true,
          certificate: res.certificate,
        });
        window.open(res.certificate.certUrl || `/certificate/${res.certificate.id}`, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to claim certificate');
    } finally {
      setClaimingCert(false);
    }
  };

  const handleCopyCertLink = () => {
    if (!certStatus?.certificate) return;
    const url = certStatus.certificate.certUrl || `https://code-host.online/certificate/${certStatus.certificate.id}`;
    navigator.clipboard.writeText(url);
    setCopiedCertLink(true);
    setTimeout(() => setCopiedCertLink(false), 2000);
  };

  const selectAvatarType = (type: AvatarType) => {
    setAvatarType(type);
    localStorage.setItem('codehost_avatar_type', type);
    window.dispatchEvent(new Event('codehost_avatar_changed'));
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
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

  const isGoogleConnected = user?.provider === 'google' || user?.email?.endsWith('@gmail.com');
  const isGithubConnected = user?.provider === 'github';

  return (
    <PanelLayout user={user} projectName="Profile">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Profile Header & Avatar */}
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative overflow-hidden">
          {isSavedNotice && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 size={13} />
              <span>Avatar Saved</span>
            </div>
          )}

          {/* Avatar Display Frame */}
          <div className="flex flex-col items-center shrink-0">
            <UserAvatar user={user} size="xl" preference={avatarType} />
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

            {/* Icon Switcher */}
            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block flex items-center justify-center md:justify-start space-x-1">
                  <span>Account Icon:</span>
                </label>
                <span className="text-[10px] font-semibold text-slate-400 text-center md:text-left">
                  Prefer Google first · Falls back to GitHub
                </span>
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <button
                  type="button"
                  onClick={() => selectAvatarType('google')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer border active:scale-95 ${
                    avatarType === 'google'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>Google (Email Icon)</span>
                  {avatarType === 'google' && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-blue-200/60 text-blue-800 px-1.5 py-0.5 rounded-md">Default</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => selectAvatarType('github')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer border active:scale-95 ${
                    avatarType === 'github'
                      ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Github size={15} />
                  <span>GitHub (Account Icon)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Official Student Cloud Deployment Certificate Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Award size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">Student Cloud Deployment Certificate</h2>
                  {certStatus?.claimed && (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-full">
                      ✓ Issued &amp; Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Official tamper-proof credential for your student developer portfolio &amp; LinkedIn.
                </p>
              </div>
            </div>

            {certStatus?.claimed && certStatus?.certificate?.certNumber && (
              <span className="font-mono text-xs font-black px-3 py-1 bg-slate-100 text-slate-800 rounded-xl border border-slate-200 self-start sm:self-auto">
                {certStatus.certificate.certNumber}
              </span>
            )}
          </div>

          <div className="pt-6">
            {certStatus?.claimed ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">
                    Credential: <span className="text-[#2563EB]">Certified Cloud Deployer</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Issued to <strong>{user?.name || user?.username}</strong> • Verified on CodeHost Cloud Infrastructure.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyCertLink}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    {copiedCertLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedCertLink ? 'Copied Link' : 'Copy Link'}</span>
                  </button>

                  <Link
                    href={`/certificate/${certStatus.certificate.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-98"
                  >
                    <span>View Certificate</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ) : certStatus?.eligible ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>Certificate Unlocked &amp; Ready to Claim!</span>
                  </div>
                  <p className="text-xs text-emerald-800/80">
                    You deployed on CodeHost! Claim your official verified certificate with a scannable QR code and add it to your LinkedIn profile.
                  </p>
                </div>

                <button
                  onClick={handleClaimCertificate}
                  disabled={claimingCert}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Award size={16} />
                  <span>{claimingCert ? 'Generating...' : 'Claim My Certificate 🎓'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">How to earn your certificate</p>
                  <p className="text-xs text-slate-500">
                    Deploy any project on CodeHost (Node.js, Python, or Docker) to unlock your verified credential with an immutable serial number and QR verification.
                  </p>
                </div>

                <Link
                  href="/dashboard/new"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shrink-0"
                >
                  <span>Deploy a Project →</span>
                </Link>
              </div>
            )}
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
