import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Status & Uptime',
  description: 'Real-time system operational status, 90-day uptime metrics, global edge latency, and service health for the CodeHost cloud platform.',
  openGraph: {
    title: 'Platform Status & Uptime | CodeHost',
    description: 'All systems operational. Continuous 24/7 telemetry monitoring of edge CDN, container orchestration, and databases.',
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
