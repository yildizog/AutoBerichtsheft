import { NextResponse } from 'next/server';
import { firebaseGet } from '@/lib/firebase';
import { StatusDoc } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await firebaseGet<StatusDoc>('status');
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
