"use client";

import React, { useState, useEffect } from 'react';
import PanelLayout from '@/components/PanelLayout';
import { fetchApi } from '@/lib/api';
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Coins, 
  Sparkles, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

interface ReferralStats {
  referralCode: string;
  referralUrl: string;
  totalReferred: number;
  totalEarnedCredits: number;
  rewardPerReferral: number;
  bonusForReferee: number;
  referredBy: string | null;
  recentReferrals: Array<{
    id: string;
    refereeUsername: string;
    refereeName: string | null;
    refereeAvatarUrl: string | null;
    rewardCredits: number;
    status: string;
    createdAt: string;
  }>;
}

export default function ReferralsPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, statsData] = await Promise.all([
          fetchApi('/auth/me'),
          fetchApi('/referrals/stats'),
        ]);
        setUser(userData.user);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load referral details', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopyLink = () => {
    if (!stats?.referralUrl) return;
    navigator.clipboard.writeText(stats.referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareText = `Deploy fullstack apps in seconds with @CodeHost! Use my invite link to get ${stats?.bonusForReferee || 50} free credits:`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(stats?.referralUrl || '');

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedShareText}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedShareText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  return (
    <PanelLayout user={user}>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-100 text-[#2563EB] rounded-lg">
                <Gift size={20} />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-[#0F172A]">Refer & Earn</h1>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Invite friends and colleagues to CodeHost. They get {stats?.bonusForReferee || 50} bonus credits on signup, and you earn {stats?.rewardPerReferral || 100} credits for every friend who joins.
            </p>
          </div>
          {stats?.referredBy && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-semibold self-start sm:self-auto">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>You were invited by @{stats.referredBy}</span>
            </div>
          )}
        </div>

        {/* Share Invite Link Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="max-w-3xl">
            <h2 className="text-lg font-bold text-[#0F172A] mb-1">Your Personal Invite Link</h2>
            <p className="text-xs text-slate-500 mb-5">
              Share this link directly or embed it in social posts, docs, or community channels.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-6">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={stats?.referralUrl || (loading ? 'Generating link...' : '')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 select-all"
                />
              </div>
              <button
                onClick={handleCopyLink}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-98 shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check size={16} className="text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
                <Share2 size={13} /> Share via:
              </span>
              <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#25D366]/10 hover:text-[#25D366] text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-[#25D366]/30 transition inline-flex items-center gap-1.5"
              >
                WhatsApp
              </a>
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-800 transition inline-flex items-center gap-1.5"
              >
                X (Twitter)
              </a>
              <a
                href={shareLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#0088cc]/10 hover:text-[#0088cc] text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-[#0088cc]/30 transition inline-flex items-center gap-1.5"
              >
                Telegram
              </a>
              <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#0077b5]/10 hover:text-[#0077b5] text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-[#0077b5]/30 transition inline-flex items-center gap-1.5"
              >
                LinkedIn
              </a>

              <div className="sm:ml-auto flex items-center gap-2 mt-2 sm:mt-0">
                <span className="text-xs text-slate-500 font-medium">Code:</span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-900 font-mono font-bold text-xs rounded-lg border border-slate-200">
                  {stats?.referralCode || '...'}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Copy Code Only"
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Friends Referred</span>
              <div className="p-2 bg-blue-50 text-[#2563EB] rounded-xl">
                <Users size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#0F172A] tracking-tight">
                {stats?.totalReferred ?? 0}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Successful signups</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credits Earned</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Coins size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#0F172A] tracking-tight">
                {stats?.totalEarnedCredits ?? 0}
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Added to wallet balance</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reward / Friend</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Sparkles size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#0F172A] tracking-tight">
                +{stats?.rewardPerReferral ?? 100}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Credits deposited instantly</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Friend Bonus</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Gift size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#0F172A] tracking-tight">
                +{stats?.bonusForReferee ?? 50}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Credits for your friend</p>
            </div>
          </div>
        </div>

        {/* 3 Step Visual Explainer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-[#0F172A] mb-6">How the Referral Program Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="flex flex-col space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-black text-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-[#0F172A] pt-1">Send Your Invite</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Copy your referral link or share via WhatsApp, Twitter, or LinkedIn with developers, teammates, and communities.
              </p>
            </div>

            <div className="flex flex-col space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-[#0F172A] pt-1">They Get 50 Credits</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                When your friend registers via email or Google/GitHub OAuth, 50 free credits are credited straight to their wallet.
              </p>
            </div>

            <div className="flex flex-col space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-[#0F172A] pt-1">You Earn 100 Credits</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You immediately receive 100 credits in your wallet balance to deploy servers, run databases, or upgrade tiers with zero cost.
              </p>
            </div>
          </div>
        </div>

        {/* Referrals History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Referral Activity</h2>
              <p className="text-xs text-slate-500">History of users who registered using your referral link</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {stats?.recentReferrals?.length || 0} total
            </span>
          </div>

          {!stats?.recentReferrals || stats.recentReferrals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Gift size={28} />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">No referrals yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                Share your unique link with fellow developers to earn 100 credits for every person who signs up!
              </p>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Copy size={14} />
                <span>Copy Your Referral Link</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Date Joined</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Credits Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {ref.refereeAvatarUrl ? (
                            <img
                              src={ref.refereeAvatarUrl}
                              alt={ref.refereeUsername}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            ref.refereeUsername.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            @{ref.refereeUsername}
                          </div>
                          {ref.refereeName && (
                            <div className="text-[11px] text-slate-400">{ref.refereeName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(ref.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-emerald-600 text-sm">
                          +{ref.rewardCredits} Credits
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PanelLayout>
  );
}
