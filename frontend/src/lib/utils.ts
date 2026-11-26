import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate post-auth redirect targets strictly to internal /dashboard routes.
 * Rejects protocol-relative URLs, backslashes, control characters, and non-dashboard paths.
 */
export function sanitizeRedirectPath(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.includes('\\') || /[\x00-\x1F\x7F]/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, 'https://code-host.online');
    if (parsed.origin !== 'https://code-host.online') return null;
    if (parsed.pathname !== '/dashboard' && !parsed.pathname.startsWith('/dashboard/')) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
