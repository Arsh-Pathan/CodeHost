"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import OAuthButtons from '@/components/oauth-buttons';
import { Gift, CheckCircle2, Tag, ChevronDown, ChevronUp } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState(initialRef);
  const [showReferralInput, setShowReferralInput] = useState(Boolean(initialRef));
  const [referrerDetails, setReferrerDetails] = useState<{
    valid: boolean;
    referrerName?: string;
    referrerUsername?: string;
    bonusCredits?: number;
  } | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.push('/dashboard');
    }
  }, [router]);

  // Validate referral code whenever it is populated or altered
  useEffect(() => {
    if (!referralCode.trim()) {
      setReferrerDetails(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi(`/referrals/validate/${encodeURIComponent(referralCode.trim())}`);
        if (res.valid) {
          setReferrerDetails(res);
        } else {
          setReferrerDetails({ valid: false });
        }
      } catch (err) {
        setReferrerDetails(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Pre-validation
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      setError('Username can only contain letters, numbers, underscores and hyphens.');
      setLoading(false);
      return;
    }

    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password, 
          username, 
          name, 
          phoneNumber,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-7 bg-white p-8 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-900 leading-tight">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#2563EB] hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Referral Welcome Notification Banner */}
        {referrerDetails?.valid && (
          <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-start gap-3">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
              <Gift size={18} />
            </div>
            <div className="text-xs text-emerald-900">
              <p className="font-bold text-sm text-emerald-950">
                🎁 You were invited by @{referrerDetails.referrerUsername || referrerDetails.referrerName}!
              </p>
              <p className="mt-0.5 text-emerald-700 font-medium">
                <span className="font-bold text-emerald-900">+{referrerDetails.bonusCredits || 50} free credits</span> will be automatically added to your wallet upon signup.
              </p>
            </div>
          </div>
        )}

        <OAuthButtons referralCode={referralCode.trim()} />

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                className="block w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm"
                placeholder="Arsh Pathan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Username *</label>
              <input
                type="text"
                required
                className="block w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm"
                placeholder="arsh_dev"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input
                type="tel"
                className="block w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email address *</label>
              <input
                type="email"
                required
                className="block w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                className="block w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Referral Code Field / Toggle */}
          <div className="pt-1">
            {!showReferralInput ? (
              <button
                type="button"
                onClick={() => setShowReferralInput(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-blue-700 transition cursor-pointer"
              >
                <Tag size={13} />
                <span>Have a referral code?</span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag size={13} className="text-[#2563EB]" />
                    <span>Referral Code (Optional)</span>
                  </label>
                  {!initialRef && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowReferralInput(false);
                        setReferralCode('');
                        setReferrerDetails(null);
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Hide
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-900 uppercase font-mono text-sm placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g. ALEX-9K2M"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  />
                  {referrerDetails?.valid && (
                    <div className="absolute right-2.5 top-2.5 text-emerald-600">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
                {referrerDetails?.valid === false && referralCode.trim() !== '' && (
                  <p className="text-[11px] font-medium text-red-500">
                    Invalid or inactive referral code
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Creating account...' : 'Create my account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
