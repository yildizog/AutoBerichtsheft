import { NextRequest, NextResponse } from 'next/server';
import { firebaseDelete, firebaseGet, firebasePatch } from '@/lib/firebase';
import { ReportContent, ReportDoc, SCHOOL_FIELDS } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await firebaseGet<ReportDoc>(`reports/${encodeURIComponent(params.id)}`);
    if (!doc) return NextResponse.json({ error: 'Bericht nicht gefunden.' }, { status: 404 });
    return NextResponse.json({ report: { id: params.id, ...doc } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    const content = body?.content as ReportContent | undefined;
    if (!content || typeof content !== 'object') {
      return NextResponse.json({ error: 'content ist erforderlich.' }, { status: 400 });
    }

    const id = encodeURIComponent(params.id);
    const existing = await firebaseGet<ReportDoc>(`reports/${id}`);
    if (!existing) return NextResponse.json({ error: 'Bericht nicht gefunden.' }, { status: 404 });

    // Nur bekannte Felder übernehmen; Multi-Path-Update, damit fremde Keys
    // unter content (z.B. vom Scraper) erhalten bleiben.
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of SCHOOL_FIELDS) {
      if (typeof content[field] === 'string') update[`content/${field}`] = content[field];
    }
    if (typeof content.workActivities === 'string') update['content/workActivities'] = content.workActivities;
    if (content.sickDays && typeof content.sickDays === 'object') {
      update['content/sickDays'] = {
        montag: Boolean(content.sickDays.montag),
        freitag: Boolean(content.sickDays.freitag),
      };
    }

    await firebasePatch(`reports/${id}`, update);
    return NextResponse.json({ ok: true, updatedAt: update.updatedAt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = encodeURIComponent(params.id);
    const existing = await firebaseGet<ReportDoc>(`reports/${id}`);
    if (!existing) return NextResponse.json({ error: 'Bericht nicht gefunden.' }, { status: 404 });
    await firebaseDelete(`reports/${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
