import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let apiStatus: any = { status: 'unknown' };
  let apiLatency = 0;

  try {
    const apiStart = Date.now();
    const res = await fetch('https://api.code-host.online/health', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    apiLatency = Date.now() - apiStart;
    if (res.ok) {
      apiStatus = await res.json();
    }
  } catch (err) {
    apiStatus = { status: 'unreachable', error: String(err) };
  }

  const memory = process.memoryUsage();
  const serverUptimeSeconds = Math.round(process.uptime());

  return NextResponse.json({
    status: apiStatus.status === 'healthy' ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    server: {
      uptimeSeconds: serverUptimeSeconds,
      memoryMb: Math.round(memory.rss / (1024 * 1024)),
      nodeVersion: process.version,
    },
    services: {
      web: { status: 'operational' },
      api: { status: apiStatus.status === 'healthy' ? 'operational' : 'degraded', latencyMs: apiLatency },
      database: { status: apiStatus.database === 'ok' ? 'operational' : 'degraded' },
      redis: { status: apiStatus.redis === 'ok' ? 'operational' : 'degraded' },
    },
    roundTripMs: Date.now() - startTime
  });
}
