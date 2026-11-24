'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

function subscribeStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useHasAuthToken(): boolean {
  return useSyncExternalStore(
    subscribeStorage,
    () => (typeof window !== 'undefined' ? Boolean(localStorage.getItem('token')) : false),
    () => false
  );
}

export function useClientPathname(fallback = '/requested-route'): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => (typeof window !== 'undefined' ? window.location.pathname || fallback : fallback),
    () => fallback
  );
}

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
