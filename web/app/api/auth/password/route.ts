import { NextRequest, NextResponse } from 'next/server';
import { saveAppPassword, verifyAppPassword } from '@/lib/password';
import { isFirebaseConfigured } from '@/lib/firebase';

export const runtime = 'nodejs';

// Ändert das App-Passwort. Nur mit gültiger Session erreichbar (middleware.ts)
// und zusätzlich durch das aktuelle Passwort abgesichert. Das neue Passwort
// wird ausschließlich als scrypt-Hash gespeichert und ist nirgends einsehbar.
export async function POST(req: NextRequest) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: 'Passwort-Änderung benötigt Firebase (FIREBASE_URL/FIREBASE_SECRET).' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword as string | undefined;
  const newPassword = body?.newPassword as string | undefined;

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' },
      { status: 400 }
    );
  }

  let currentOk = false;
  try {
    currentOk = Boolean(currentPassword) && (await verifyAppPassword(currentPassword as string));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  if (!currentOk) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Aktuelles Passwort ist falsch.' }, { status: 401 });
  }

  try {
    await saveAppPassword(newPassword);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
