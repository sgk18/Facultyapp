import { NextRequest, NextResponse } from 'next/server';
import { GoogleClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new NextResponse('Missing userId query parameter', { status: 400 });
  }

  // Dynamically resolve redirect URI to match the environment (localhost vs production)
  const reqUrl = new URL(req.url);
  const redirectUri = `${reqUrl.origin}/api/auth/google/callback`;

  const authUrl = GoogleClient.getAuthUrl(userId, redirectUri);
  return NextResponse.redirect(authUrl);
}
