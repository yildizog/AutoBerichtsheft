import { NextRequest, NextResponse } from 'next/server';
import { dispatchUploadWorkflow } from '@/lib/github';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reportId, content } = body || {};
    if (!reportId || !content) {
      return NextResponse.json({ error: 'reportId und content sind erforderlich.' }, { status: 400 });
    }
    await dispatchUploadWorkflow(reportId, content);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
