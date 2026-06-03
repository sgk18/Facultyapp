import { prisma } from '@/lib/prisma';
import { GoogleClient } from '@/lib/google';
import { NotificationService } from './notification.service';

export class SyncService {
  /**
   * Refreshes the Google Account access token if needed.
   * Helper that retrieves the account from DB, updates it, and returns the active accessToken.
   */
  private static async getActiveAccessToken(userId: string): Promise<string | null> {
    const account = await prisma.googleAccount.findUnique({
      where: { userId },
    });

    if (!account) return null;

    // In a real-world production system, you'd store token expiration time and refresh only if expired.
    // For simplicity and resilience, we check if we have a refresh token and refresh it to guarantee a fresh token.
    if (account.refreshToken) {
      try {
        const freshToken = await GoogleClient.refreshAccessToken(account.refreshToken);
        await prisma.googleAccount.update({
          where: { userId },
          data: { accessToken: freshToken },
        });
        return freshToken;
      } catch (err) {
        console.error(`Token refresh failed for user ${userId}:`, err);
        return account.accessToken; // Fallback to current token
      }
    }

    return account.accessToken;
  }

  /**
   * Scans connected Gmail accounts for academic deadlines, then parses and registers them.
   */
  static async syncGmailForUser(userId: string): Promise<{ success: boolean; extracted: number }> {
    const account = await prisma.googleAccount.findUnique({
      where: { userId },
    });

    if (!account || !account.syncGmail) {
      return { success: false, extracted: 0 };
    }

    const token = await this.getActiveAccessToken(userId);
    if (!token) return { success: false, extracted: 0 };

    try {
      const messages = await GoogleClient.fetchEmails(token);
      let count = 0;

      for (const msg of messages) {
        const headers = msg.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'Academic Alert';
        const bodySnippet = msg.snippet || '';
        
        // Parse email details through the rule engine
        const parsed = this.parseEmailForDeadline(subject, bodySnippet);
        if (!parsed) continue;

        // Check if this deadline already exists by checking if a deadline with the same title and due date exists for this user
        const existing = await prisma.deadline.findFirst({
          where: {
            title: parsed.title,
            ownerId: userId,
            dueDate: parsed.dueDate,
          },
        });

        if (!existing) {
          // Get the user's department to link the deadline
          const user = await prisma.user.findUnique({
            where: { id: userId },
          });
          if (!user) continue;

          // Create the deadline
          const deadline = await prisma.deadline.create({
            data: {
              title: parsed.title,
              description: parsed.description,
              dueDate: parsed.dueDate,
              priority: parsed.priority,
              ownerId: userId,
              departmentId: user.departmentId,
            },
          });

          // Create an in-app notification
          await prisma.notification.create({
            data: {
              userId,
              title: `AI Extracted: ${parsed.title}`,
              body: `Auto-created deadline from email. Due: ${parsed.dueDate.toLocaleDateString()}`,
              type: 'DEADLINE',
              relatedDeadlineId: deadline.id,
            },
          });

          // Create a reminder entry
          await prisma.reminder.create({
            data: {
              userId,
              title: `Submit: ${parsed.title}`,
              description: parsed.description,
              reminderTime: new Date(parsed.dueDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
            },
          });

          // Create a local calendar event
          await prisma.calendarEvent.create({
            data: {
              userId,
              title: `Deadline: ${parsed.title}`,
              startTime: parsed.dueDate,
              endTime: new Date(parsed.dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
              source: 'APP',
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
   * Syncs calendar events between internal database and Google Calendar (two-way).
   */
  static async syncCalendarForUser(userId: string): Promise<{ success: boolean; synced: number }> {
    const account = await prisma.googleAccount.findUnique({
      where: { userId },
    });

    if (!account || !account.syncCalendar) {
      return { success: false, synced: 0 };
    }

    const token = await this.getActiveAccessToken(userId);
    if (!token) return { success: false, synced: 0 };

    try {
      let count = 0;

      // 1. Fetch events from Google Calendar (events from past 30 days onwards)
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const googleEvents = await GoogleClient.fetchCalendarEvents(token, oneMonthAgo);

      for (const gEvent of googleEvents) {
        if (!gEvent.summary) continue;

        // Extract dates
        const startStr = gEvent.start?.dateTime || gEvent.start?.date;
        const endStr = gEvent.end?.dateTime || gEvent.end?.date;
        if (!startStr || !endStr) continue;

        const startTime = new Date(startStr);
        const endTime = new Date(endStr);

        // Check if event already exists locally
        const existing = await prisma.calendarEvent.findUnique({
          where: { googleEventId: gEvent.id },
        });

        if (!existing) {
          await prisma.calendarEvent.create({
            data: {
              userId,
              googleEventId: gEvent.id,
              title: gEvent.summary,
              startTime,
              endTime,
              source: 'GOOGLE',
            },
          });
          count++;
        }
      }

      // 2. Push local APP-created calendar events to Google Calendar
      const localEvents = await prisma.calendarEvent.findMany({
        where: {
          userId,
          source: 'APP',
          googleEventId: null,
        },
      });

      for (const localEvent of localEvents) {
        const googleEventId = await GoogleClient.createCalendarEvent(token, {
          title: localEvent.title,
          startTime: localEvent.startTime,
          endTime: localEvent.endTime,
          description: 'Created via CHRIST Faculty Platform',
        });

        if (googleEventId) {
          await prisma.calendarEvent.update({
            where: { id: localEvent.id },
            data: { googleEventId },
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
   * Heuristic/Rule-based parser to extract deadlines, due dates, and priority from email subject and snippet.
   */
  private static parseEmailForDeadline(subject: string, body: string): {
    title: string;
    dueDate: Date;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  } | null {
    const combined = `${subject} ${body}`.toLowerCase();
    
    // Check if email relates to deadlines or academic deliverables
    const hasKeywords = /deadline|due|submit|upload|circular|marks|exam|invigilation|viva/i.test(combined);
    if (!hasKeywords) return null;

    // Filter out potential spam/notifications that aren't actual submissions
    if (combined.includes('approved') || combined.includes('completed') || combined.includes('marked as read')) {
      return null;
    }

    // Standardize Title
    let title = subject;
    if (title.toUpperCase().startsWith('Fwd:') || title.toUpperCase().startsWith('Re:')) {
      title = title.substring(4).trim();
    }

    // Default due date: 7 days from now
    let dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    dueDate.setHours(16, 0, 0, 0); // Standard submission time (4:00 PM)

    // Extraction 1: Check for "tomorrow"
    if (combined.includes('tomorrow')) {
      dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      dueDate.setHours(16, 0, 0, 0);
    } 
    // Extraction 2: Check for Month names and day numbers (e.g. "15 June" or "June 25")
    else {
      const months = [
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
        'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
      ];

      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        const monthIdx = combined.indexOf(month);
        if (monthIdx !== -1) {
          // Look for digits near the month name
          const boundaryText = combined.substring(
            Math.max(0, monthIdx - 8),
            Math.min(combined.length, monthIdx + month.length + 8)
          );
          const digitMatch = boundaryText.match(/\b\d{1,2}\b/);
          if (digitMatch) {
            const day = parseInt(digitMatch[0], 10);
            if (day > 0 && day <= 31) {
              const year = new Date().getFullYear();
              const monthVal = i % 12;
              
              const parsedDate = new Date(year, monthVal, day, 16, 0, 0, 0);
              // If the parsed date is in the past, assign next year
              if (parsedDate.getTime() < Date.now()) {
                parsedDate.setFullYear(year + 1);
              }
              dueDate = parsedDate;
              break;
            }
          }
        }
      }
    }

    // Establish priority rating
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (combined.includes('urgent') || combined.includes('immediate') || combined.includes('important') || combined.includes('asap')) {
      priority = 'HIGH';
    } else if (combined.includes('optional') || combined.includes('whenever')) {
      priority = 'LOW';
    }

    return {
      title,
      dueDate,
      description: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
      priority,
    };
  }
}
