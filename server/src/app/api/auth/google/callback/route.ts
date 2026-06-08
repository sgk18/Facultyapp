import { NextRequest, NextResponse } from 'next/server';
import { GoogleClient } from '@/lib/google';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // Passed as the state param in connect route

  if (!code || !userId) {
    return new NextResponse(
      'Invalid callback request. Missing auth code or state parameters.',
      { status: 400 }
    );
  }

  try {
    // Dynamically resolve redirect URI to match the exact URI used to get the authorization code
    const reqUrl = new URL(req.url);
    const redirectUri = `${reqUrl.origin}${reqUrl.pathname}`;

    // 1. Exchange OAuth code for access and refresh tokens
    const tokens = await GoogleClient.exchangeCodeForTokens(code, redirectUri);

    // 2. Fetch the user's Google profile information
    const profile = await GoogleClient.getUserProfile(tokens.accessToken);

    // 3. Verify user profile exists in internal database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return new NextResponse('Internal user record not found.', { status: 404 });
    }

    // 4. Update User details with googleId and enable sync toggles
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleId: profile.googleId,
        gmailSyncEnabled: true,
        calendarSyncEnabled: true,
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken || null,
      },
    });

    // 5. Render a styled success HTML page that deep-links back to the app
    const successHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google Calendar Connected</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
          }
          .card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 48px 32px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(0, 0, 0, 0.06);
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background-color: #f0fdf4;
            color: #10B981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 24px auto;
            border: 2px solid #dcfce7;
            font-weight: bold;
          }
          h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            color: #0147AD;
            margin: 0 0 12px 0;
          }
          p {
            color: #4B5563;
            font-size: 1rem;
            line-height: 1.6;
            margin: 0 0 28px 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #0147AD 0%, #1D5FD1 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            box-shadow: 0 4px 12px rgba(1, 71, 173, 0.15);
            transition: all 0.2s ease;
          }
          .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(1, 71, 173, 0.25);
          }
          .status {
            font-size: 0.85rem;
            color: #9CA3AF;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="success-icon">✓</div>
          <h1>Calendar Linked Successfully!</h1>
          <p>Your Google account has been connected to the CHRIST Faculty Platform. Deadlines and reminders can now be synchronized automatically with your Google Calendar.</p>
          <a href="facultyapp://google/callback/success" class="btn" id="returnBtn">Return to App</a>
          <p class="status" id="statusText">Redirecting back to the app...</p>
        </div>
        <script>
          // Auto-redirect to app via deep link (closes Chrome Custom Tab on Android)
          function redirectToApp() {
            window.location.href = 'facultyapp://google/callback/success';
          }
          // Auto-redirect after 1.5s
          setTimeout(redirectToApp, 1500);
        </script>
      </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    console.error('Google Callback Error:', error);
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google Connection Failed</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #DCDCDC;
            font-family: 'Inter', sans-serif;
            color: #111827;
          }
          .card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 48px 32px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(0, 0, 0, 0.06);
          }
          .error-icon {
            width: 64px;
            height: 64px;
            background-color: #fef2f2;
            color: #EF4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 24px auto;
            border: 2px solid #fee2e2;
            font-weight: bold;
          }
          h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            color: #EF4444;
            margin: 0 0 12px 0;
          }
          p {
            color: #4B5563;
            font-size: 1rem;
            line-height: 1.6;
            margin: 0 0 28px 0;
          }
          .btn {
            display: inline-block;
            background: #374151;
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            transition: all 0.2s ease;
          }
          .btn:hover {
            background-color: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="error-icon">✕</div>
          <h1>Connection Failed</h1>
          <p>We could not link your Google Calendar profile at this time: ${error.message || 'Unknown OAuth exception'}</p>
          <a href="#" class="btn" onclick="window.close(); return false;">Close Window</a>
        </div>
      </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
