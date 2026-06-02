import { NextResponse } from 'next/server';
import { GoogleClient } from '@/lib/google';

export async function GET() {
  const url = GoogleClient.getAuthUrl();
  return NextResponse.redirect(url);
}
