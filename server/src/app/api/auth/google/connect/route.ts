import { NextRequest, NextResponse } from 'next/server';
import { GoogleClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new NextResponse('Missing userId query parameter', { status: 400 });
  }

  const authUrl = GoogleClient.getAuthUrl(userId);
  return NextResponse.redirect(authUrl);
}
