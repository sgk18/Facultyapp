import { NextRequest, NextResponse } from 'next/server';
import { GoogleClient } from '@/lib/google';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ success: false, error: 'Authorization code missing' }, { status: 400 });
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokens = await GoogleClient.exchangeCodeForTokens(code);

    // 2. Fetch Google profile information
    const profile = await GoogleClient.getUserProfile(tokens.accessToken);
    const normalizedEmail = profile.email.toLowerCase().trim();

    // 3. Enforce CHRIST University institutional email restriction
    const isApprovedDomain = normalizedEmail.endsWith('@christuniversity.in');
    if (!isApprovedDomain) {
      return NextResponse.json({
        success: false,
        error: 'Access restricted. Institutional @christuniversity.in email required.'
      }, { status: 403 });
    }

    // 4. Find or create the corresponding user profile in internal database
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Find or create default general department
      let department = await prisma.department.findFirst();
      if (!department) {
        department = await prisma.department.create({
          data: {
            name: 'General Faculty Department',
            code: 'GEN',
          },
        });
      }

      // Onboard as new FACULTY user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: profile.fullName,
          avatarUrl: profile.picture || null,
          role: 'FACULTY',
          departmentId: department.id,
        },
      });
    } else {
      // Keep profile picture updated from Google
      if (profile.picture && user.avatarUrl !== profile.picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: profile.picture },
        });
      }
    }

    // Check if user is suspended
    if (user.isSuspended) {
      return NextResponse.json({
        success: false,
        error: 'Your account has been suspended. Please contact administrator.'
      }, { status: 403 });
    }

    // 5. Link Google credentials
    await prisma.googleAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        googleId: profile.googleId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        syncGmail: false, // Explicit consent needed
        syncCalendar: false, // Explicit consent needed
      },
      update: {
        accessToken: tokens.accessToken,
        // Only update refresh_token if Google returned it ( offline access consent prompt )
        ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
      },
    });

    // 6. Generate local JWT token
    const localToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 7. HTML response writing token to client storage and redirecting
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authenticating...</title>
        <style>
          body {
            font-family: 'Outfit', 'Inter', sans-serif;
            background-color: #DCDCDC;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            color: #111827;
          }
          .card {
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            text-align: center;
            max-width: 400px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #DCDCDC;
            border-top: 4px solid #0147AD;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>Authentication Successful</h2>
          <p>Redirecting you back to CHRIST Faculty Hub...</p>
        </div>
        <script>
          // Save JWT token locally
          localStorage.setItem('admin_token', '${localToken}');
          
          // Communicate token back to Flutter Webview if active
          if (window.parent) {
            window.parent.postMessage({ token: '${localToken}' }, '*');
          }
          
          // Redirect to Admin dashboard or main entrypoint
          setTimeout(function() {
            window.location.href = '/admin';
          }, 1000);
        </script>
      </body>
      </html>
    `;

    return new NextResponse(htmlResponse, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    console.error('Google OAuth callback failed:', error);
    return NextResponse.json({ success: false, error: 'Authentication exchange error', details: error.message }, { status: 500 });
  }
}
