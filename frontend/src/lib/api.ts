export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    return 'https://api.code-host.online';
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://api.code-host.online'
    : 'http://localhost:4000';
};

export const API_URL = getApiUrl();

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

export function getErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

export const AUTH_CHANGE_EVENT = 'codehost-auth-change';

export function notifyAuthStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function clearClientAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('codehost_user_cache');
  localStorage.removeItem('codehost_projects_cache');
  localStorage.removeItem('codehost_wallet_cache');
  notifyAuthStateChanged();
}

let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    clearClientAuth();
    return null;
  }

  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearClientAuth();
          return null;
        }
        const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
        if (data.accessToken) {
          localStorage.setItem('token', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        notifyAuthStateChanged();
        return data.accessToken || null;
      } catch {
        clearClientAuth();
        return null;
      } finally {
        inflightRefresh = null;
      }
    })();
  }

  return inflightRefresh;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getApiUrl();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const buildHeaders = (authToken: string | null): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>);
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: buildHeaders(token),
  });

  const isAuthEndpoint =
    endpoint.startsWith('/auth/login') ||
    endpoint.startsWith('/auth/register') ||
    endpoint.startsWith('/auth/refresh');

  if (res.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
    const refreshedToken = await refreshAccessToken(baseUrl);
    if (refreshedToken) {
      res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: buildHeaders(refreshedToken),
      });
    } else {
      clearClientAuth();
    }
  }

  if (!res.ok) {
    let errorMessage = 'Something went wrong';
    try {
      const errorData = (await res.json()) as { error?: string };
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Not JSON
    }
    throw new ApiError(errorMessage, res.status);
  }

  return res.json();
}
