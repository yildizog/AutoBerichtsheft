'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { AppSettings, DEFAULT_SETTINGS } from '@/lib/types';
import { Switch } from '@/components/switch';
import { IconLogout } from '@/components/icons';
import { useToast } from '@/components/providers';

interface Integrations {
  github: boolean;
  firebase: boolean;
  gemini: boolean;
  email: boolean;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();

  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwRepeat, setPwRepeat] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [i, s] = await Promise.all([
          apiFetch<Integrations>('/api/integrations'),
          apiFetch<{ settings: AppSettings }>('/api/settings'),
        ]);
        setIntegrations(i);
        setSettings(s.settings);
      } catch (err) {
        toast((err as Error).message, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(next: Partial<AppSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    setSaving(true);
    try {
      await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(next) });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwNew !== pwRepeat) {
      toast('Die neuen Passwörter stimmen nicht überein.', 'error');
      return;
    }
    setPwSaving(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      setPwCurrent('');
      setPwNew('');
      setPwRepeat('');
      toast('Passwort geändert.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="ios-scroll-area min-h-[100dvh]">
      <header className="ios-navbar">
        <div className="mx-auto max-w-md px-4 py-3">
          <h1 className="text-[28px] font-bold tracking-tight">Einstellungen</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <span className="ios-spinner" />
        </div>
      ) : (
        <>
          <div className="ios-group-title">Wochen-Digest</div>
          <div className="ios-group">
            <div className="ios-row justify-between">
              <div>
                <div className="text-[15px]">Wöchentliche Zusammenfassung</div>
                <div className="text-[12px] text-label-secondary">E-Mail mit Status &amp; aktueller Serie</div>
              </div>
              <Switch on={settings.digestEnabled} onToggle={() => persist({ digestEnabled: !settings.digestEnabled })} label="Wochen-Digest aktivieren" />
            </div>
            <div className="ios-row">
              <span className="w-24 flex-shrink-0 text-[15px] text-label-secondary">E-Mail</span>
              <input
                type="email"
                className="ios-input text-right"
                placeholder="du@beispiel.de"
                value={settings.digestEmail}
                onChange={(e) => setSettings((s) => ({ ...s, digestEmail: e.target.value }))}
                onBlur={() => persist({ digestEmail: settings.digestEmail })}
              />
            </div>
            <div className="ios-row justify-between">
              <span className="text-[15px] text-label-secondary">Wochentag</span>
              <select
                className="ios-input w-auto text-right"
                value={settings.digestWeekday}
                onChange={(e) => persist({ digestWeekday: Number(e.target.value) })}
              >
                {WEEKDAYS.map((w, i) => (
                  <option key={w} value={i} className="bg-surface-tertiary">
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!integrations?.email && settings.digestEnabled && (
            <p className="px-5 pt-2 text-[12px] text-ios-orange">
              Hinweis: E-Mail-Versand ist serverseitig noch nicht konfiguriert (EMAIL_HOST/USER/PASS).
            </p>
          )}

          <div className="ios-group-title">Integrationen</div>
          <div className="ios-group">
            <IntegrationRow label="GitHub Actions" ok={integrations?.github} />
            <IntegrationRow label="Firebase (Berichte & Status)" ok={integrations?.firebase} />
            <IntegrationRow label="Gemini KI-Korrektur" ok={integrations?.gemini} />
            <IntegrationRow label="E-Mail-Versand" ok={integrations?.email} />
          </div>
          <p className="px-5 pt-2 text-[12px] leading-relaxed text-label-secondary">
            Integrations-Zugangsdaten (GitHub, Firebase, Gemini, E-Mail) werden ausschließlich als Vercel
            Environment Variables gespeichert und nie an den Browser gesendet. Zum Ändern: Vercel-Projekt →
            Settings → Environment Variables.
          </p>

          <div className="ios-group-title">Sicherheit</div>
          <form onSubmit={handleChangePassword} className="ios-group">
            <div className="ios-row">
              <span className="w-32 flex-shrink-0 text-[15px] text-label-secondary">Aktuell</span>
              <input
                type="password"
                autoComplete="current-password"
                className="ios-input text-right"
                placeholder="Aktuelles Passwort"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
              />
            </div>
            <div className="ios-row">
              <span className="w-32 flex-shrink-0 text-[15px] text-label-secondary">Neu</span>
              <input
                type="password"
                autoComplete="new-password"
                className="ios-input text-right"
                placeholder="Mind. 8 Zeichen"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
              />
            </div>
            <div className="ios-row">
              <span className="w-32 flex-shrink-0 text-[15px] text-label-secondary">Wiederholen</span>
              <input
                type="password"
                autoComplete="new-password"
                className="ios-input text-right"
                placeholder="Neues Passwort"
                value={pwRepeat}
                onChange={(e) => setPwRepeat(e.target.value)}
              />
            </div>
            <div className="ios-row justify-end">
              <button
                type="submit"
                disabled={pwSaving || !pwCurrent || pwNew.length < 8 || !pwRepeat}
                className="ios-btn-tinted !px-4 !py-1.5 text-[13px]"
              >
                {pwSaving ? <span className="ios-spinner" /> : 'Passwort ändern'}
              </button>
            </div>
          </form>
          <p className="px-5 pt-2 text-[12px] leading-relaxed text-label-secondary">
            Das Passwort wird nur als scrypt-Hash gespeichert und kann nirgends eingesehen werden – hier
            lässt es sich ausschließlich neu setzen.
          </p>

          <div className="ios-group-title">Konto</div>
          <div className="ios-group">
            <button onClick={handleLogout} className="ios-row ios-row-active w-full text-left text-ios-red">
              <IconLogout />
              <span className="text-[15px] font-medium">Abmelden</span>
            </button>
          </div>

          <p className="px-5 pb-10 pt-6 text-center text-[12px] text-label-secondary">
            {saving ? 'Speichere…' : 'Änderungen werden automatisch gespeichert.'}
          </p>
        </>
      )}
    </div>
  );
}

function IntegrationRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="ios-row justify-between">
      <span className="text-[15px]">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${ok ? 'text-ios-green' : 'text-label-secondary'}`}>
        <span className={`ios-dot ${ok ? 'bg-ios-green' : 'bg-label-secondary'}`} />
        {ok ? 'Aktiv' : 'Nicht konfiguriert'}
      </span>
    </div>
  );
}
