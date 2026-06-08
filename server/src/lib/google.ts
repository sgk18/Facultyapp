/**
 * Google API Client Utility for CHRIST Faculty App
 * Handles OAuth, Gmail, and Google Calendar integrations using lightweight standard fetch requests.
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  fullName: string;
  picture?: string;
}

export class GoogleClient {
  /**
   * Generates the Google OAuth authorization URL.
   */
  static getAuthUrl(state?: string, redirectUri?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar',
    ];

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri || GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent', // Force refresh token retrieval
    });

    if (state) {
      params.append('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  static async exchangeCodeForTokens(code: string, redirectUri?: string): Promise<GoogleTokens> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri || GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth code exchange failed: ${errText}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Refreshes an expired access token using the refresh token.
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth token refresh failed: ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  /**
   * Fetches Google User Profile info (name, email, profile photo URL).
   */
  static async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve Google user profile.');
    }

    const data = await res.json();
    return {
      googleId: data.sub,
      email: data.email,
      fullName: data.name,
      picture: data.picture,
    };
  }

  /**
   * Fetches the user's Gmail message list with a maximum limit.
   */
  static async fetchEmails(accessToken: string, q = 'subject:(deadline OR circular OR marks OR exam OR viva OR submission)'): Promise<any[]> {
    const params = new URLSearchParams({
      maxResults: '20',
      q,
    });

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('Failed to list Gmail messages:', await res.text());
      return [];
    }

    const listData = await res.json();
    if (!listData.messages) {
      return [];
    }

    // Resolve detailed message contents in parallel
    const detailsPromises = listData.messages.map(async (msg: { id: string }) => {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (msgRes.ok) {
        return msgRes.json();
      }
      return null;
    });

    const resolved = await Promise.all(detailsPromises);
    return resolved.filter((item) => item !== null);
  }

  /**
   * Fetches events from Google Calendar.
   */
  static async fetchCalendarEvents(accessToken: string, timeMinStr: string): Promise<any[]> {
    const params = new URLSearchParams({
      timeMin: timeMinStr,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('Failed to fetch calendar events from Google:', await res.text());
      return [];
    }

    const data = await res.json();
    return data.items || [];
  }

  /**
   * Creates a calendar event in the user's Google Calendar.
   */
  static async createCalendarEvent(
    accessToken: string,
    event: { title: string; startTime: Date; endTime: Date; description?: string }
  ): Promise<string | null> {
    const body = {
      summary: event.title,
      description: event.description || '',
      start: { dateTime: event.startTime.toISOString() },
      end: { dateTime: event.endTime.toISOString() },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error('Failed to push event to Google Calendar:', await res.text());
      return null;
    }

    const data = await res.json();
    return data.id;
  }

  /**
   * Deletes a calendar event from Google Calendar.
   */
  static async deleteCalendarEvent(
    accessToken: string,
    googleEventId: string
  ): Promise<boolean> {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.error('Failed to delete event from Google Calendar:', await res.text());
      return false;
    }

    return true;
  }
}
