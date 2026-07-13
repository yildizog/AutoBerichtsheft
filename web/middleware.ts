import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// Öffentliche Pfade, die ohne Login erreichbar sein müssen.
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/favicon.ico'];

// Next generiert Manifest/Icon-Routen mit eigenen (teils gehashten) Dateinamen
// (z.B. /icon.png, /apple-icon.png, /manifest.webmanifest) – per Prefix erlauben.
const PUBLIC_PREFIXES = ['/manifest', '/icon', '/apple-icon'];

// Der wöchentliche Digest-Cron ruft sich selbst über einen Secret-Header auf,
// braucht also keine Browser-Session (siehe /api/cron/weekly-digest/route.ts).
const CRON_PREFIX = '/api/cron/';

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(CRON_PREFIX)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
