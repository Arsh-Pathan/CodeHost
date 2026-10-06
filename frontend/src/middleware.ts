import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const host = hostHeader.toLowerCase().split(':')[0];
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'code-host.online').toLowerCase();

  // Primary platform hosts serving the main dashboard and marketing site
  const isPlatformHost =
    !host ||
    host === platformDomain ||
    host === `www.${platformDomain}` ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app');

  // If this is a project subdomain or custom domain that was routed to codehost-web
  // (because no active container proxy upstream exists for it)
  if (!isPlatformHost) {
    const pathname = request.nextUrl.pathname;

    // Allow Next.js static bundles and public root assets through
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname === '/favicon.ico' ||
      pathname === '/icon.svg' ||
      pathname === '/favicon.svg' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/manifest.webmanifest'
    ) {
      return NextResponse.next();
    }

    // Rewrite to /project-status preserving host and path information
    const url = request.nextUrl.clone();
    url.pathname = '/project-status';
    url.searchParams.set('host', host);
    url.searchParams.set('path', pathname);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next.js internals and static assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|favicon\\.svg|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)',
  ],
};
