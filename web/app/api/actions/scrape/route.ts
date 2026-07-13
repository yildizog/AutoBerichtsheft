import { NextRequest, NextResponse } from 'next/server';
import { dispatchScrapeWorkflow } from '@/lib/github';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    await dispatchScrapeWorkflow(body?.targetDate || undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
