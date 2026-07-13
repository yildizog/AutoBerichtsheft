import { NextResponse } from 'next/server';
import { firebaseGet } from '@/lib/firebase';
import { Report, ReportDoc } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await firebaseGet<Record<string, ReportDoc>>('reports');
    const reports: Report[] = data
      ? Object.entries(data)
          .map(([id, doc]) => ({ id, ...doc }))
          .sort((a, b) => (a.id < b.id ? 1 : -1))
      : [];
    return NextResponse.json({ reports });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
