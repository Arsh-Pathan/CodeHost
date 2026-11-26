'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

const noopSubscribe = () => () => {};

function subscribeAuthState(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('codehost-auth-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('codehost-auth-change', callback);
  };
}

export function useHasAuthToken(): boolean {
  return useSyncExternalStore(
    subscribeAuthState,
    () => (typeof window !== 'undefined' ? Boolean(localStorage.getItem('token')) : false),
    () => false
  );
}

export function useClientPathname(fallback = '/requested-route'): string {
  const pathname = usePathname();
  return pathname || fallback;
}

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
