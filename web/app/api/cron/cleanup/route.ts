import { NextRequest, NextResponse } from 'next/server';
import { firebaseDelete, firebaseGet } from '@/lib/firebase';
import { ReportDoc, StatusDoc } from '@/lib/types';

export const runtime = 'nodejs';

// Räumt erledigte Berichte auf: Wochen mit Status "success", die seit mehr als
// 7 Tagen unverändert sind und nicht mehr auf IHK-Genehmigung warten, werden
// aus Firebase gelöscht. Aufruf via Vercel Cron (siehe vercel.json), abgesichert
// über CRON_SECRET wie der Weekly-Digest.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
    }
  }

  try {
    const [reports, status] = await Promise.all([
      firebaseGet<Record<string, ReportDoc>>('reports'),
      firebaseGet<StatusDoc>('status'),
    ]);
    if (!reports) return NextResponse.json({ deleted: [] });

    // Wochen, die laut Status-Check noch auf Genehmigung warten, gelten in der
    // App nicht als "Erledigt" und bleiben stehen.
    const pending = new Set(status?.details?.pending || []);
    const now = Date.now();
    const deleted: string[] = [];
    const skipped: string[] = [];

    for (const [id, doc] of Object.entries(reports)) {
      if (doc.status !== 'success' || pending.has(id)) continue;
      // Jüngster bekannter Zeitpunkt: letzte Bearbeitung, sonst Anlage, sonst
      // die Wochen-ID selbst (Datumsformat). Ohne datierbaren Anhaltspunkt
      // wird nichts gelöscht.
      const ts = parseTimestamp(doc.updatedAt) ?? parseTimestamp(doc.createdAt) ?? parseTimestamp(id);
      if (ts === null) {
        skipped.push(id);
        continue;
      }
      if (now - ts > WEEK_MS) {
        await firebaseDelete(`reports/${encodeURIComponent(id)}`);
        deleted.push(id);
      }
    }

    return NextResponse.json({ deleted, skipped });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
