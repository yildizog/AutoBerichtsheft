// Schlanker REST-Client für die Firebase Realtime Database.
// Läuft bewusst ohne das schwere Firebase JS SDK (kein Client-Bundle, keine
// öffentlichen DB-Regeln nötig) – alle Aufrufe passieren serverseitig mit dem
// Secret aus den Environment Variables.

function getConfig() {
  const url = (process.env.FIREBASE_URL || '').trim().replace(/\/$/, '');
  const secret = (process.env.FIREBASE_SECRET || process.env.FIREBASE_KEY || '').trim();
  return { url, secret, configured: Boolean(url && secret) };
}

export function isFirebaseConfigured() {
  return getConfig().configured;
}

export async function firebaseGet<T = unknown>(path: string): Promise<T | null> {
  const { url, secret, configured } = getConfig();
  if (!configured) return null;
  const res = await fetch(`${url}/${path}.json?auth=${secret}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Firebase GET ${path} fehlgeschlagen: ${res.status}`);
  return (await res.json()) as T;
}

export async function firebasePut<T = unknown>(path: string, data: T): Promise<void> {
  const { url, secret, configured } = getConfig();
  if (!configured) throw new Error('Firebase ist nicht konfiguriert (FIREBASE_URL/FIREBASE_SECRET fehlen).');
  const res = await fetch(`${url}/${path}.json?auth=${secret}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PUT ${path} fehlgeschlagen: ${res.status}`);
}

export async function firebasePatch<T = unknown>(path: string, data: Partial<T>): Promise<void> {
  const { url, secret, configured } = getConfig();
  if (!configured) throw new Error('Firebase ist nicht konfiguriert (FIREBASE_URL/FIREBASE_SECRET fehlen).');
  const res = await fetch(`${url}/${path}.json?auth=${secret}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PATCH ${path} fehlgeschlagen: ${res.status}`);
}
