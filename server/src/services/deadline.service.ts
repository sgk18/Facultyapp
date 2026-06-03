import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';
import { DeadlineInput } from '@/validators/deadline';
import { NotificationService } from '@/services/notification.service';
import { GoogleClient } from '@/lib/google';

export class DeadlineService {
  /**
   * Lists deadlines based on role restrictions.
   */
  static async listDeadlines(user: AuthenticatedUser) {
    return prisma.deadline.findMany({
      where: { ownerId: user.id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        department: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Fetches a deadline by ID and verifies read access permissions.
   */
  static async getDeadlineById(id: string, user: AuthenticatedUser) {
    const deadline = await prisma.deadline.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        department: true,
      },
    });

    if (!deadline) {
      throw new NotFoundError('Deadline not found');
    }

    if (deadline.ownerId !== user.id) {
      throw new ForbiddenError('You do not have permission to view this deadline');
    }

    return deadline;
  }

  /**
   * Creates a deadline and schedules its reminders/notifications/calendar events.
   */
  static async createDeadline(input: DeadlineInput, user: AuthenticatedUser) {
    if (user.role === 'FACULTY' && input.departmentId !== user.departmentId) {
      throw new ForbiddenError('You can only create deadlines within your own department');
    }

    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!department) {
      throw new NotFoundError('Target department not found');
    }

    // 1. Create the deadline
    const deadline = await prisma.deadline.create({
      data: {
        title: input.title,
        description: input.description,
        dueDate: new Date(input.dueDate),
        priority: input.priority,
        departmentId: input.departmentId,
        ownerId: user.id,
        isCompleted: input.isCompleted ?? false,
        status: input.status ?? 'ACTIVE',
      },
      include: {
        owner: true,
        department: true,
      },
    });

    // 2. Handle Google Calendar sync if requested
    if (input.addToGoogleCalendar) {
      const account = await prisma.googleAccount.findUnique({
        where: { userId: user.id },
      });
      if (!account) {
        throw new ValidationError('Google account is not connected. Please connect it first.');
      }
      if (!account.syncCalendar) {
        await prisma.googleAccount.update({
          where: { userId: user.id },
          data: { syncCalendar: true },
        });
      }

      await prisma.calendarEvent.create({
        data: {
          userId: user.id,
          deadlineId: deadline.id,
          title: `Deadline: ${deadline.title}`,
          description: deadline.description || 'Academic Deadline',
          startTime: deadline.dueDate,
          endTime: new Date(deadline.dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
          eventType: 'DEADLINE',
          source: 'APP',
        },
      });

      const { SyncService } = require('./sync.service');
      SyncService.syncCalendarForUser(user.id).catch((err: any) => {
        console.error('Failed to sync new deadline to Google Calendar:', err);
      });
    }

    // 3. Generate Reminders based on timing rules
    const settings = input.reminderSettings || ['24_HOURS', '6_HOURS', '1_HOUR'];
    const offsets = [
      { key: '24_HOURS', label: '24 hours before', offsetMs: 24 * 60 * 60 * 1000 },
      { key: '6_HOURS', label: '6 hours before', offsetMs: 6 * 60 * 60 * 1000 },
      { key: '1_HOUR', label: '1 hour before', offsetMs: 1 * 60 * 60 * 1000 },
    ];

    const now = new Date();
    for (const offset of offsets) {
      if (settings.includes(offset.key)) {
        const reminderTime = new Date(deadline.dueDate.getTime() - offset.offsetMs);
        if (reminderTime > now) {
          await prisma.reminder.create({
            data: {
              userId: user.id,
              deadlineId: deadline.id,
              title: `Reminder: ${deadline.title} (${offset.label})`,
              description: `Deadline "${deadline.title}" is due in ${offset.label}.`,
              reminderTime,
              status: 'PENDING',
            },
          });
        }
      }
    }

    // 4. Send creation notification
    const formattedDate = new Date(deadline.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    await NotificationService.notifySingleUser({
      userId: user.id,
      title: `New Academic Deadline: ${deadline.title}`,
      body: `You set a new private deadline: "${deadline.title}". Due: ${formattedDate}.`,
      deadlineTitle: deadline.title,
      dueDateStr: formattedDate,
      description: deadline.description,
      type: 'DEADLINE',
      relatedDeadlineId: deadline.id,
    });

    return deadline;
  }

  /**
   * Updates an existing deadline and synchronizes reminders/calendar.
   */
  static async updateDeadline(
    id: string,
    input: Partial<DeadlineInput>,
    user: AuthenticatedUser
  ) {
    const deadline = await prisma.deadline.findUnique({
      where: { id },
    });

    if (!deadline) {
      throw new NotFoundError('Deadline not found');
    }

    if (deadline.ownerId !== user.id) {
      throw new ForbiddenError('You do not have permission to modify this deadline');
    }

    if (input.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!deptExists) {
        throw new NotFoundError('Target department not found');
      }
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.dueDate !== undefined) updateData.dueDate = new Date(input.dueDate);
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
    
    // Support completion state bridging
    if (input.isCompleted !== undefined) {
      updateData.isCompleted = input.isCompleted;
      updateData.status = input.isCompleted ? 'COMPLETED' : 'ACTIVE';
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
      updateData.isCompleted = input.status === 'COMPLETED';
    }

    const updatedDeadline = await prisma.deadline.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
        department: true,
      },
    });

    const isCancelled = updatedDeadline.status === 'CANCELLED';
    const isCompleted = updatedDeadline.status === 'COMPLETED';

    // Handle Reminders Update/Cancellation
    if (isCancelled || isCompleted) {
      // Cancel/Delete all pending reminders
      await prisma.reminder.deleteMany({
        where: { deadlineId: id, status: 'PENDING' },
      });
    } else if (input.dueDate !== undefined || input.title !== undefined) {
      // Regenerate reminders for modified date/title
      await prisma.reminder.deleteMany({
        where: { deadlineId: id },
      });

      const settings = input.reminderSettings || ['24_HOURS', '6_HOURS', '1_HOUR'];
      const offsets = [
        { key: '24_HOURS', label: '24 hours before', offsetMs: 24 * 60 * 60 * 1000 },
        { key: '6_HOURS', label: '6 hours before', offsetMs: 6 * 60 * 60 * 1000 },
        { key: '1_HOUR', label: '1 hour before', offsetMs: 1 * 60 * 60 * 1000 },
      ];

      const now = new Date();
      for (const offset of offsets) {
        if (settings.includes(offset.key)) {
          const reminderTime = new Date(updatedDeadline.dueDate.getTime() - offset.offsetMs);
          if (reminderTime > now) {
            await prisma.reminder.create({
              data: {
                userId: user.id,
                deadlineId: id,
                title: `Reminder: ${updatedDeadline.title} (${offset.label})`,
                description: `Deadline "${updatedDeadline.title}" is due in ${offset.label}.`,
                reminderTime,
                status: 'PENDING',
              },
            });
          }
        }
      }
    }

    // Handle Calendar Event Sync/Removal
    const calendarEvent = await prisma.calendarEvent.findFirst({
      where: { deadlineId: id },
    });

    if (calendarEvent) {
      if (isCancelled) {
        // Delete calendar event from Google Calendar and locally
        if (calendarEvent.googleEventId) {
          try {
            const { SyncService } = require('./sync.service');
            const token = await SyncService.getActiveAccessToken(user.id);
            if (token) {
              await GoogleClient.deleteCalendarEvent(token, calendarEvent.googleEventId);
            }
          } catch (err) {
            console.error('Failed to delete Google Calendar event:', err);
          }
        }
        await prisma.calendarEvent.delete({ where: { id: calendarEvent.id } }).catch(() => {});
      } else if (input.dueDate !== undefined || input.title !== undefined || input.description !== undefined) {
        // Update details of calendar event
        const updatedEvent = await prisma.calendarEvent.update({
          where: { id: calendarEvent.id },
          data: {
            title: `Deadline: ${updatedDeadline.title}`,
            description: updatedDeadline.description || 'Academic Deadline',
            startTime: updatedDeadline.dueDate,
            endTime: new Date(updatedDeadline.dueDate.getTime() + 60 * 60 * 1000),
          },
        });

        // Trigger Google Calendar sync update (deletes old one and creates new one if googleEventId changes)
        if (updatedEvent.googleEventId) {
          try {
            const { SyncService } = require('./sync.service');
            const token = await SyncService.getActiveAccessToken(user.id);
            if (token) {
              await GoogleClient.deleteCalendarEvent(token, updatedEvent.googleEventId);
              const newGoogleEventId = await GoogleClient.createCalendarEvent(token, {
                title: updatedEvent.title,
                startTime: updatedEvent.startTime,
                endTime: updatedEvent.endTime,
                description: updatedEvent.description || 'Created via CHRIST Faculty Platform',
              });
              await prisma.calendarEvent.update({
                where: { id: updatedEvent.id },
                data: { googleEventId: newGoogleEventId },
              });
            }
          } catch (err) {
            console.error('Failed to sync updated event to Google Calendar:', err);
          }
        }
      }
    }

    // Notify of updates/cancellation
    const formattedDate = new Date(updatedDeadline.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    let notificationTitle = `Updated Academic Deadline: ${updatedDeadline.title}`;
    let notificationBody = `The private deadline "${updatedDeadline.title}" has been modified. New Due Date: ${formattedDate}.`;

    if (isCancelled) {
      notificationTitle = `Cancelled Academic Deadline: ${updatedDeadline.title}`;
      notificationBody = `The deadline "${updatedDeadline.title}" has been marked as CANCELLED. All reminders have been cleared.`;
    } else if (isCompleted) {
      notificationTitle = `Completed Academic Deadline: ${updatedDeadline.title}`;
      notificationBody = `Great job! The deadline "${updatedDeadline.title}" has been marked as COMPLETED.`;
    }

    await NotificationService.notifySingleUser({
      userId: user.id,
      title: notificationTitle,
      body: notificationBody,
      deadlineTitle: updatedDeadline.title,
      dueDateStr: formattedDate,
      description: updatedDeadline.description,
      type: 'DEADLINE',
      relatedDeadlineId: updatedDeadline.id,
    });

    return updatedDeadline;
  }

  /**
   * Deletes a deadline after verifying permissions.
   */
  static async deleteDeadline(id: string, user: AuthenticatedUser) {
    const deadline = await prisma.deadline.findUnique({
      where: { id },
    });

    if (!deadline) {
      throw new NotFoundError('Deadline not found');
    }

    if (deadline.ownerId !== user.id) {
      throw new ForbiddenError('You do not have permission to delete this deadline');
    }

    // Clean up linked Google Calendar events before deletion
    const calendarEvent = await prisma.calendarEvent.findFirst({
      where: { deadlineId: id },
    });

    if (calendarEvent && calendarEvent.googleEventId) {
      try {
        const { SyncService } = require('./sync.service');
        const token = await SyncService.getActiveAccessToken(user.id);
        if (token) {
          await GoogleClient.deleteCalendarEvent(token, calendarEvent.googleEventId);
        }
      } catch (err) {
        console.error('Failed to delete Google Calendar event:', err);
      }
    }

    await prisma.deadline.delete({
      where: { id },
    });

    return true;
  }
}
