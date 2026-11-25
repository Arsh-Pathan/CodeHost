"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hashRaw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const hashParams = new URLSearchParams(hashRaw);

    const accessToken = hashParams.get('accessToken') || searchParams.get('accessToken');
    const refreshToken = hashParams.get('refreshToken') || searchParams.get('refreshToken');
    const error = hashParams.get('error') || searchParams.get('error');

    if (typeof window !== 'undefined' && (window.location.hash || window.location.search)) {
      window.history.replaceState({}, '', '/auth/callback');
    }

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (accessToken && refreshToken) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      let nextPath = '/dashboard';
      if (typeof window !== 'undefined') {
        const storedRedirect = sessionStorage.getItem('postAuthRedirect');
        sessionStorage.removeItem('postAuthRedirect');
        if (storedRedirect && storedRedirect.startsWith('/dashboard') && !storedRedirect.startsWith('//')) {
          nextPath = storedRedirect;
        }
      }
      router.push(nextPath);
    } else {
      router.push('/login?error=oauth_failed');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="text-slate-600 font-medium">Signing you in...</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-600 font-medium">Signing you in...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
