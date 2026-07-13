import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'crypto';
import { firebaseGet, firebasePut, isFirebaseConfigured } from './firebase';

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => (err ? reject(err) : resolve(derived)));
  });
}

// Format: scrypt$N$r$p$<salt base64>$<hash base64>
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

const HASH_PATH = 'auth/passwordHash';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })) as Buffer;
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = (await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })) as Buffer;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function plainEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual verlangt gleiche Länge – Längenunterschied ist dann eben sichtbar.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

async function getStoredPasswordHash(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  return await firebaseGet<string>(HASH_PATH);
}

// Setzt ein neues App-Passwort: es wird ausschließlich als scrypt-Hash in
// Firebase abgelegt, das Klartext-Passwort verlässt diese Funktion nie.
export async function saveAppPassword(newPassword: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Passwort-Änderung benötigt Firebase (FIREBASE_URL/FIREBASE_SECRET). Bitte zuerst konfigurieren.'
    );
  }
  await firebasePut(HASH_PATH, await hashPassword(newPassword));
}

// Prüft das eingegebene Passwort. Vorrang hat der in Firebase gespeicherte
// Hash; existiert (noch) keiner, dient APP_PASSWORD aus den Environment
// Variables als Fallback und wird beim ersten erfolgreichen Login automatisch
// als Hash migriert.
export async function verifyAppPassword(password: string): Promise<boolean> {
  const stored = await getStoredPasswordHash();
  if (stored) return await verifyPasswordHash(password, stored);

  const envPassword = process.env.APP_PASSWORD;
  if (!envPassword) {
    throw new Error(
      'Kein Passwort konfiguriert: weder ein gespeicherter Hash noch APP_PASSWORD vorhanden.'
    );
  }

  const ok = plainEqual(password, envPassword);
  if (ok && isFirebaseConfigured()) {
    // Migration: ab jetzt liegt nur noch der Hash in Firebase.
    try {
      await saveAppPassword(password);
    } catch {
      // Migration darf den Login nicht blockieren.
    }
  }
  return ok;
}
