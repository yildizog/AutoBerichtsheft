import { NextRequest, NextResponse } from 'next/server';
import { firebaseGet } from '@/lib/firebase';
import { getSettings } from '@/lib/settings';
import { sendMail, isEmailConfigured } from '@/lib/email';
import { Report, ReportDoc, StatusDoc } from '@/lib/types';

export const runtime = 'nodejs';

// Neues, eigenständiges Feature: einmal pro Woche eine freundliche Zusammenfassung
// per Mail ("X Wochen eingetragen, Y offen, aktuelle Serie: Z Wochen am Stück").
// Ergänzt den bestehenden "fehlende Berichte"-Alarm aus
// tests/check_missing_reports.spec.ts, ersetzt ihn aber nicht – diese Datei ist
// komplett unabhängig davon.
//
// Aufruf via Vercel Cron (siehe vercel.json). Vercel hängt bei gesetztem
// CRON_SECRET automatisch den Header "Authorization: Bearer <CRON_SECRET>" an.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
    }
  }

  try {
    const settings = await getSettings();
    if (!settings.digestEnabled || !settings.digestEmail) {
      return NextResponse.json({ skipped: 'Digest ist deaktiviert oder keine Ziel-Adresse gesetzt.' });
    }

    const today = new Date();
    if (today.getDay() !== settings.digestWeekday) {
      return NextResponse.json({ skipped: `Heute (${today.getDay()}) ist nicht der gewünschte Wochentag (${settings.digestWeekday}).` });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'E-Mail-Versand ist serverseitig nicht konfiguriert.' }, { status: 500 });
    }

    const [reportsData, status] = await Promise.all([
      firebaseGet<Record<string, ReportDoc>>('reports'),
      firebaseGet<StatusDoc>('status'),
    ]);

    const reports: Report[] = reportsData
      ? Object.entries(reportsData)
          .map(([id, doc]) => ({ id, ...doc }))
          .sort((a, b) => (a.id < b.id ? 1 : -1))
      : [];

    const streak = computeStreak(reports);
    const latest = reports.slice(0, 4);

    const lines = [
      `Wöchentliche Zusammenfassung deines Berichtshefts`,
      ``,
      status
        ? `Status: ${status.message} (fehlend: ${status.missingCount}, ausstehend: ${status.pendingCount})`
        : 'Status: noch keine Prüfung durchgeführt.',
      `Aktuelle Serie ohne Lücke: ${streak} Woche(n)`,
      ``,
      `Letzte Wochen:`,
      ...latest.map((r) => `- ${r.dateLabel || r.id}: ${r.status || 'unbekannt'}`),
    ];

    await sendMail({
      to: settings.digestEmail,
      subject: `📋 Wochenüberblick Berichtsheft – Serie: ${streak} Woche(n)`,
      text: lines.join('\n'),
    });

    return NextResponse.json({ sent: true, streak });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function computeStreak(reports: Report[]): number {
  let streak = 0;
  for (const r of reports) {
    if (r.status === 'success' || r.status === 'waiting') streak++;
    else break;
  }
  return streak;
}
