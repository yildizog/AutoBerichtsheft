import { NextResponse } from 'next/server';
import { isGithubConfigured } from '@/lib/github';
import { isFirebaseConfigured } from '@/lib/firebase';
import { isGeminiConfigured } from '@/lib/gemini';
import { isEmailConfigured } from '@/lib/email';

export const runtime = 'nodejs';

// Gibt NUR an, ob eine Integration konfiguriert ist – niemals die Secrets selbst.
// Secrets werden ausschließlich über Vercel Environment Variables verwaltet.
export async function GET() {
  return NextResponse.json({
    github: isGithubConfigured(),
    firebase: isFirebaseConfigured(),
    gemini: isGeminiConfigured(),
    email: isEmailConfigured(),
  });
}
