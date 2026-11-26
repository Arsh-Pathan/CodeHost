import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let apiStatus: { status: string; database?: string; redis?: string; error?: string } = { status: 'unknown' };
  let apiLatency = 0;

  try {
    const apiStart = Date.now();
    const res = await fetch('https://api.code-host.online/health', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    apiLatency = Date.now() - apiStart;
    if (res.ok) {
      apiStatus = await res.json();
    }
  } catch {
    apiStatus = { status: 'unreachable' };
  }

  return NextResponse.json({
    status: apiStatus.status === 'healthy' ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      web: { status: 'operational' },
      api: { status: apiStatus.status === 'healthy' ? 'operational' : 'degraded', latencyMs: apiLatency },
      database: { status: apiStatus.database === 'ok' ? 'operational' : 'degraded' },
      redis: { status: apiStatus.redis === 'ok' ? 'operational' : 'degraded' },
    },
    roundTripMs: Date.now() - startTime
  });
}
