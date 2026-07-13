import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { verifyAppPassword } from '@/lib/password';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password as string | undefined;

  let valid = false;
  try {
    valid = Boolean(password) && (await verifyAppPassword(password as string));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  if (!valid) {
    // Bewusst generische Fehlermeldung + leichte Verzögerung gegen Brute-Force.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Falsches Passwort.' }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
