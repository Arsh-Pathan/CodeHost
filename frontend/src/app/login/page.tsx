"use client";

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, getErrorMessage, notifyAuthStateChanged } from '@/lib/api';
import { sanitizeRedirectPath } from '@/lib/utils';
import OAuthButtons from '@/components/oauth-buttons';
import { LogoWithText } from '@/components/Logo';
import { Loader2, ArrowLeft } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const oauthError = searchParams.get('error');
  const templateParam = searchParams.get('template') || '';
  const safeRedirectParam = sanitizeRedirectPath(searchParams.get('redirect'));
  const resetTokenParam = searchParams.get('reset') || '';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(oauthError ? 'OAuth sign-in failed. Please try again.' : '');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(resetTokenParam ? 'reset' : 'login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const nextDestination = templateParam
    ? `/dashboard/new?template=${encodeURIComponent(templateParam)}`
    : safeRedirectParam || '/dashboard';

  useEffect(() => {
    if (resetTokenParam) return;
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace(nextDestination);
    }
  }, [router, nextDestination, resetTokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      notifyAuthStateChanged();
      router.replace(nextDestination);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      setNotice(res.message || 'If an account exists for that email address, a password reset link has been sent.');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetTokenParam, newPassword }),
      });
      setNotice(res.message || 'Password reset successfully. Please sign in.');
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const signupHref = templateParam
    ? `/signup?template=${encodeURIComponent(templateParam)}`
    : safeRedirectParam
      ? `/signup?redirect=${encodeURIComponent(safeRedirectParam)}`
      : '/signup';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-24 pb-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <div>
          <div className="flex justify-center mb-6">
            <LogoWithText />
          </div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            {mode === 'forgot'
              ? 'Reset your password'
              : mode === 'reset'
                ? 'Choose a new password'
                : 'Sign in to your account'}
          </h2>
          {mode === 'login' && (
            <p className="mt-2 text-center text-sm text-slate-600">
              Or{' '}
              <Link
                href={signupHref}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                create a new account
              </Link>
            </p>
          )}
        </div>

        {verified && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md text-sm text-center border border-emerald-100 font-medium">
            Email verified! You can now access all features.
          </div>
        )}

        {notice && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md text-sm text-center border border-emerald-100 font-medium">
            {notice}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {mode === 'login' && (
          <>
            <OAuthButtons />

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email or Username</label>
                <input
                  type="text"
                  required
                  className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="you@example.com or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setNotice('');
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          </>
        )}

        {mode === 'forgot' && (
          <form className="space-y-5" onSubmit={handleForgotSubmit}>
            <p className="text-sm text-slate-600">
              Enter your registered email address and we will send you a 1-hour password reset link.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {loading ? 'Sending reset link...' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setNotice('');
              }}
              className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to sign in</span>
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form className="space-y-5" onSubmit={handleResetSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                maxLength={128}
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                maxLength={128}
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {loading ? 'Resetting password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
