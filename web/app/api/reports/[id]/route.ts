import { NextRequest, NextResponse } from 'next/server';
import { firebaseGet } from '@/lib/firebase';
import { ReportDoc } from '@/lib/types';

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
