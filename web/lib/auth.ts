import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'bs_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

function getSecretKey() {
  // Fällt auf APP_PASSWORD zurück, falls kein separates SESSION_SECRET gesetzt ist,
  // damit die App auch mit minimaler Konfiguration sofort funktioniert.
  const secret = process.env.SESSION_SECRET || process.env.APP_PASSWORD;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET oder APP_PASSWORD ist nicht gesetzt. Bitte in den Vercel Environment Variables konfigurieren.'
    );
  }
  return new TextEncoder().encode(secret.padEnd(32, '0'));
}

export async function createSessionToken(): Promise<string> {
  return await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  // Lokal (http://localhost) würde ein Secure-Cookie z.B. von Safari verworfen
  // und man wäre nach jedem Reload wieder ausgeloggt – daher nur in Produktion.
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};
