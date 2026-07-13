import { NextRequest, NextResponse } from 'next/server';
import { refineSchoolFields, refineWorkActivities } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body?.mode === 'school') {
      const fields = body.fields as Record<string, string>;
      if (!fields || !Object.keys(fields).length) {
        return NextResponse.json({ error: 'Keine Felder zum Korrigieren übergeben.' }, { status: 400 });
      }
      const corrected = await refineSchoolFields(fields);
      return NextResponse.json({ fields: corrected });
    }

    if (body?.mode === 'work') {
      const text = (body.text as string) || '';
      if (!text.trim()) {
        return NextResponse.json({ error: 'Kein Text zum Überarbeiten übergeben.' }, { status: 400 });
      }
      const refined = await refineWorkActivities(text);
      return NextResponse.json({ text: refined });
    }

    return NextResponse.json({ error: 'Unbekannter mode. Erwartet: "school" oder "work".' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
