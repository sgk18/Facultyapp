import { prisma } from '@/lib/prisma';

export class SyncService {
  /**
   * Scans connected Gmail accounts for academic deadlines, then parses and registers them (Simulated for MVP).
   */
  static async syncGmailForUser(userId: string): Promise<{ success: boolean; extracted: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.gmailSyncEnabled) {
      return { success: false, extracted: 0 };
    }

    try {
      let count = 0;
      // Simulated Email Extraction for MVP
      const mockDeadlines = [
        {
          title: 'HOD Department Report Submission',
          description: 'Submit the monthly department activity and productivity report to the HOD office.',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          priority: 'HIGH' as const,
        }
      ];

      for (const parsed of mockDeadlines) {
        // Check if this deadline already exists
        const existing = await prisma.deadline.findFirst({
          where: {
            title: parsed.title,
            ownerId: userId,
            dueDate: parsed.dueDate,
          },
        });

        if (!existing) {
          // Create the deadline directly with consolidated reminder/calendar fields
          const deadline = await prisma.deadline.create({
            data: {
              title: parsed.title,
              description: parsed.description,
              dueDate: parsed.dueDate,
              priority: parsed.priority,
              ownerId: userId,
              departmentId: user.departmentId,
              reminderEnabled: true,
              reminderTime: new Date(parsed.dueDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
              syncToCalendar: true,
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
   * Syncs calendar events between internal database and Google Calendar (Simulated for MVP).
   */
  static async syncCalendarForUser(userId: string): Promise<{ success: boolean; synced: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.calendarSyncEnabled) {
      return { success: false, synced: 0 };
    }

    try {
      let count = 0;

      // Simulated pull from Google Calendar
      const mockEvent = {
        googleEventId: 'mock_g_event_12345',
        title: 'CHRIST Faculty General Body Meeting',
        description: 'Monthly meeting for all faculty members in the main auditorium.',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      };

      const existing = await prisma.deadline.findUnique({
        where: { googleEventId: mockEvent.googleEventId },
      });

      if (!existing) {
        await prisma.deadline.create({
          data: {
            title: mockEvent.title,
            description: mockEvent.description,
            dueDate: mockEvent.dueDate,
            ownerId: userId,
            departmentId: user.departmentId,
            syncToCalendar: true,
            googleEventId: mockEvent.googleEventId,
          },
        });
        count++;
      }

      return { success: true, synced: count };
    } catch (error) {
      console.error(`Calendar sync failed for user ${userId}:`, error);
      return { success: false, synced: 0 };
    }
  }
}
