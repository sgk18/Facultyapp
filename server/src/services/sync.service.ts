import { prisma } from '@/lib/prisma';
import { GoogleClient } from '@/lib/google';

async function getOrRefreshAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || !user.googleAccessToken) return null;
  if (!user.googleRefreshToken) return user.googleAccessToken;

  // Verify if token is still valid
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${user.googleAccessToken}`);
    if (res.ok) {
      const data = await res.json();
      if (Number(data.expires_in) > 60) {
        return user.googleAccessToken;
      }
    }
  } catch (e) {
    // ignore
  }

  // Refresh token
  try {
    const newAccessToken = await GoogleClient.refreshAccessToken(user.googleRefreshToken);
    await prisma.user.update({
      where: { id: userId },
      data: { googleAccessToken: newAccessToken },
    });
    return newAccessToken;
  } catch (error) {
    console.error('Failed to refresh Google access token for user:', userId, error);
    return user.googleAccessToken;
  }
}

function getSubject(msg: any): string {
  const headers = msg.payload?.headers || [];
  const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
  return subjectHeader ? subjectHeader.value : 'No Subject';
}

function extractDate(text: string): Date {
  const dateRegex = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
  const match = text.match(dateRegex);
  if (match) {
    const d = new Date(`${match[1]}-${match[2]}-${match[3]}`);
    if (!isNaN(d.getTime())) return d;
  }
  
  const slashRegex = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/;
  const matchSlash = text.match(slashRegex);
  if (matchSlash) {
    const d = new Date(`${matchSlash[3]}-${matchSlash[2]}-${matchSlash[1]}`);
    if (!isNaN(d.getTime())) return d;
  }

  if (text.toLowerCase().includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

export class SyncService {
  /**
   * Scans connected Gmail accounts for academic deadlines, then parses and registers them.
   */
  static async syncGmailForUser(userId: string): Promise<{ success: boolean; extracted: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.gmailSyncEnabled) {
      return { success: false, extracted: 0 };
    }

    const accessToken = await getOrRefreshAccessToken(userId);
    if (!accessToken) {
      return { success: false, extracted: 0 };
    }

    try {
      let count = 0;
      const emails = await GoogleClient.fetchEmails(accessToken);

      for (const email of emails) {
        const subject = getSubject(email);
        const snippet = email.snippet || '';
        const dueDate = extractDate(snippet + ' ' + subject);
        
        // Ensure due date is in the future
        if (dueDate.getTime() <= Date.now()) {
          dueDate.setDate(dueDate.getDate() + 7);
        }

        // Clean/determine priority
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (subject.toLowerCase().includes('urgent') || subject.toLowerCase().includes('high priority') || snippet.toLowerCase().includes('urgent')) {
          priority = 'HIGH';
        }

        // Check if this deadline already exists
        const existing = await prisma.deadline.findFirst({
          where: {
            title: subject,
            ownerId: userId,
          },
        });

        if (!existing) {
          const deadline = await prisma.deadline.create({
            data: {
              title: subject,
              description: snippet || 'Extracted from Gmail',
              dueDate: dueDate,
              priority: priority,
              ownerId: userId,
              departmentId: user.departmentId,
              reminderEnabled: true,
              reminderTime: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
              syncToCalendar: true,
            },
          });

          // Create an in-app notification
          await prisma.notification.create({
            data: {
              userId,
              title: `AI Extracted: ${subject}`,
              body: `Auto-created deadline from email. Due: ${dueDate.toLocaleDateString()}`,
              type: 'DEADLINE',
              relatedDeadlineId: deadline.id,
            },
          });

          count++;
        }
      }

      return { success: true, extracted: count };
    } catch (error) {
      console.error(`Gmail sync failed for user ${userId}:`, error);
      return { success: false, extracted: 0 };
    }
  }

  /**
   * Syncs calendar events from Google Calendar to our local deadlines table.
   */
  static async syncCalendarForUser(userId: string): Promise<{ success: boolean; synced: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.calendarSyncEnabled) {
      return { success: false, synced: 0 };
    }

    const accessToken = await getOrRefreshAccessToken(userId);
    if (!accessToken) {
      return { success: false, synced: 0 };
    }

    try {
      let count = 0;
      const events = await GoogleClient.fetchCalendarEvents(accessToken, new Date().toISOString());

      for (const event of events) {
        if (!event.id) continue;

        const existing = await prisma.deadline.findUnique({
          where: { googleEventId: event.id },
        });

        if (!existing) {
          const dueDateStr = event.start?.dateTime || event.start?.date;
          if (!dueDateStr) continue;

          await prisma.deadline.create({
            data: {
              title: event.summary || 'Google Calendar Event',
              description: event.description || 'Synced from Google Calendar',
              dueDate: new Date(dueDateStr),
              ownerId: userId,
              departmentId: user.departmentId,
              syncToCalendar: true,
              googleEventId: event.id,
            },
          });
          count++;
        }
      }

      return { success: true, synced: count };
    } catch (error) {
      console.error(`Calendar sync failed for user ${userId}:`, error);
      return { success: false, synced: 0 };
    }
  }

  /**
   * Pushes a specific deadline to Google Calendar.
   */
  static async pushDeadlineToGoogleCalendar(deadlineId: string): Promise<string | null> {
    const deadline = await prisma.deadline.findUnique({
      where: { id: deadlineId },
      include: { owner: true }
    });

    if (!deadline || !deadline.syncToCalendar || !deadline.owner.googleAccessToken) {
      return null;
    }

    const accessToken = await getOrRefreshAccessToken(deadline.ownerId);
    if (!accessToken) return null;

    try {
      if (deadline.googleEventId) {
        await GoogleClient.deleteCalendarEvent(accessToken, deadline.googleEventId).catch(() => {});
      }

      const startTime = new Date(deadline.dueDate);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const googleEventId = await GoogleClient.createCalendarEvent(accessToken, {
        title: deadline.title,
        startTime,
        endTime,
        description: deadline.description || 'CHRIST Faculty deadline event',
      });

      if (googleEventId) {
        await prisma.deadline.update({
          where: { id: deadlineId },
          data: { googleEventId },
        });
      }

      return googleEventId;
    } catch (err) {
      console.error('Failed to push deadline to Google Calendar:', err);
      return null;
    }
  }

  /**
   * Deletes a deadline from Google Calendar.
   */
  static async deleteDeadlineFromGoogleCalendar(ownerId: string, googleEventId: string): Promise<boolean> {
    const accessToken = await getOrRefreshAccessToken(ownerId);
    if (!accessToken) return false;

    try {
      return await GoogleClient.deleteCalendarEvent(accessToken, googleEventId);
    } catch (err) {
      console.error('Failed to delete deadline from Google Calendar:', err);
      return false;
    }
  }
}
