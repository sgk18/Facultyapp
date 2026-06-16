import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  
  // 1. Enforce CORS
  // In production, you would fetch allowedOrigins from an environment variable.
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  const allowedOrigins = allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean);
  
  // Allow no-origin (e.g. mobile apps) or origins in the allowed list
  const isAllowed = allowedOrigins.includes(origin) || origin === ''; 
  
  if (!isAllowed) {
    return new NextResponse('CORS Origin not allowed', { status: 403 });
  }

  // 2. Request Size Limits (approximate via Content-Length)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return new NextResponse('Payload Too Large', { status: 413 });
  }

  const response = NextResponse.next();
  
  // Add CORS headers to response
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
