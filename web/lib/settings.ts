import { firebaseGet, firebasePut, isFirebaseConfigured } from './firebase';
import { AppSettings, DEFAULT_SETTINGS } from './types';

// App-Einstellungen (nicht geheim) werden im selben Firebase-Projekt unter
// "settings/app" abgelegt – so braucht es keinen zusätzlichen Datenspeicher-Dienst,
// und die Werte sind sofort auf allen Geräten sichtbar.
export async function getSettings(): Promise<AppSettings> {
  if (!isFirebaseConfigured()) return DEFAULT_SETTINGS;
  const stored = await firebaseGet<Partial<AppSettings>>('settings/app');
  return { ...DEFAULT_SETTINGS, ...(stored || {}) };
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await firebasePut('settings/app', next);
  return next;
}
