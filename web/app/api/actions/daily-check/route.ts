import { NextResponse } from 'next/server';
import { dispatchDailyCheckWorkflow } from '@/lib/github';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await dispatchDailyCheckWorkflow();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
