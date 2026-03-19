"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/login?error=${error}`);
      return;
    }

    if (accessToken && refreshToken) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      router.push('/dashboard');
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
