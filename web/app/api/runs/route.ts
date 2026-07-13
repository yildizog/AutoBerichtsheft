import { NextResponse } from 'next/server';
import { getLatestRuns, getRunJobs } from '@/lib/github';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const runs = await getLatestRuns(1);
    if (!runs.length) return NextResponse.json({ run: null, jobs: [] });

    const run = runs[0];
    let jobs: Awaited<ReturnType<typeof getRunJobs>> = [];
    try {
      jobs = await getRunJobs(run.id);
    } catch {
      // Job-Details sind ein "nice to have" – Run-Status reicht als Fallback.
    }

    return NextResponse.json({ run, jobs });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
