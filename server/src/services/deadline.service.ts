import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import { DeadlineInput } from '@/validators/deadline';
import { NotificationService } from '@/services/notification.service';

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
      throw new ForbiddenError(
        'You do not have permission to view this deadline',
      );
    }

    return deadline;
  }

  /**
   * Creates a deadline and schedules its reminders/notifications/calendar events.
   */
  static async createDeadline(input: DeadlineInput, user: AuthenticatedUser) {
    if (user.role === 'FACULTY' && input.departmentId !== user.departmentId) {
      throw new ForbiddenError(
        'You can only create deadlines within your own department',
      );
    }

    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!department) {
      throw new NotFoundError('Target department not found');
    }

    // Calculate reminderTime if reminderSettings is provided
    let reminderEnabled = false;
    let reminderTime: Date | null = null;
    const settings = input.reminderSettings || [];
    if (settings.length > 0) {
      const now = new Date();
      const dueDate = new Date(input.dueDate);
      const offsets = [
        { key: '24_HOURS', offsetMs: 24 * 60 * 60 * 1000 },
        { key: '6_HOURS', offsetMs: 6 * 60 * 60 * 1000 },
        { key: '1_HOUR', offsetMs: 1 * 60 * 60 * 1000 },
      ];
      for (const offset of offsets) {
        if (settings.includes(offset.key)) {
          const computedTime = new Date(dueDate.getTime() - offset.offsetMs);
          if (computedTime > now) {
            reminderEnabled = true;
            reminderTime = computedTime;
            break;
          }
        }
      }
    }

    // 1. Create the deadline directly with consolidated reminder/calendar fields
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
        syncToCalendar: input.addToGoogleCalendar ?? false,
        reminderEnabled,
        reminderTime,
      },
      include: {
        owner: true,
        department: true,
      },
    });

    // 2. Push to Google Calendar if requested
    if (deadline.syncToCalendar) {
      const { SyncService } = await import('./sync.service');
      SyncService.pushDeadlineToGoogleCalendar(deadline.id).catch(
        (err: unknown) => {
          console.error('Failed to push new deadline to Google Calendar:', err);
        },
      );
    }

    // 3. Send creation notification
    const formattedDate = new Date(deadline.dueDate).toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      },
    );

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

    // 4. Automatically schedule reminder notifications
    await DeadlineService.scheduleNotificationsForDeadline(
      deadline.id,
      input.reminderSettings,
    );

    return deadline;
  }

  /**
   * Updates an existing deadline and synchronizes reminders/calendar.
   */
  static async updateDeadline(
    id: string,
    input: Partial<DeadlineInput>,
    user: AuthenticatedUser,
  ) {
    const deadline = await prisma.deadline.findUnique({
      where: { id },
    });

    if (!deadline) {
      throw new NotFoundError('Deadline not found');
    }

    if (deadline.ownerId !== user.id) {
      throw new ForbiddenError(
        'You do not have permission to modify this deadline',
      );
    }

    if (input.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!deptExists) {
        throw new NotFoundError('Target department not found');
      }
    }

    const updateData: {
      title?: string;
      description?: string;
      dueDate?: Date;
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      departmentId?: string;
      isCompleted?: boolean;
      status?: string;
      reminderEnabled?: boolean;
      reminderTime?: Date | null;
      syncToCalendar?: boolean;
    } = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.dueDate !== undefined)
      updateData.dueDate = new Date(input.dueDate);
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.departmentId !== undefined)
      updateData.departmentId = input.departmentId;

    // Support completion state bridging
    if (input.isCompleted !== undefined) {
      updateData.isCompleted = input.isCompleted;
      updateData.status = input.isCompleted ? 'COMPLETED' : 'ACTIVE';
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
      updateData.isCompleted = input.status === 'COMPLETED';
    }

    // If dueDate or reminderSettings change, recalculate reminderTime
    if (input.dueDate !== undefined || input.reminderSettings !== undefined) {
      const settings = input.reminderSettings || [];
      const dueDate = new Date(input.dueDate || deadline.dueDate);
      if (settings.length > 0) {
        const now = new Date();
        const offsets = [
          { key: '24_HOURS', offsetMs: 24 * 60 * 60 * 1000 },
          { key: '6_HOURS', offsetMs: 6 * 60 * 60 * 1000 },
          { key: '1_HOUR', offsetMs: 1 * 60 * 60 * 1000 },
        ];
        let found = false;
        for (const offset of offsets) {
          if (settings.includes(offset.key)) {
            const computedTime = new Date(dueDate.getTime() - offset.offsetMs);
            if (computedTime > now) {
              updateData.reminderEnabled = true;
              updateData.reminderTime = computedTime;
              found = true;
              break;
            }
          }
        }
        if (!found) {
          updateData.reminderEnabled = false;
          updateData.reminderTime = null;
        }
      } else {
        updateData.reminderEnabled = false;
        updateData.reminderTime = null;
      }
    }

    if (input.addToGoogleCalendar !== undefined) {
      updateData.syncToCalendar = input.addToGoogleCalendar;
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

    // Push or delete from Google Calendar based on sync preference
    const { SyncService } = await import('./sync.service');
    if (updatedDeadline.syncToCalendar) {
      SyncService.pushDeadlineToGoogleCalendar(updatedDeadline.id).catch(
        (err: unknown) => {
          console.error(
            'Failed to push updated deadline to Google Calendar:',
            err,
          );
        },
      );
    } else if (deadline.googleEventId) {
      // If it was synced previously but now syncToCalendar is false, remove from Google Calendar
      SyncService.deleteDeadlineFromGoogleCalendar(
        user.id,
        deadline.googleEventId,
      ).catch((err: unknown) => {
        console.error(
          'Failed to delete unsynced event from Google Calendar:',
          err,
        );
      });
      // Clear googleEventId in database
      await prisma.deadline.update({
        where: { id: updatedDeadline.id },
        data: { googleEventId: null },
      });
    }

    // Notify of updates/cancellation
    const formattedDate = new Date(updatedDeadline.dueDate).toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      },
    );

    let notificationTitle = `Updated Academic Deadline: ${updatedDeadline.title}`;
    let notificationBody = `The private deadline "${updatedDeadline.title}" has been modified. New Due Date: ${formattedDate}.`;

    if (isCancelled) {
      notificationTitle = `Cancelled Academic Deadline: ${updatedDeadline.title}`;
      notificationBody = `The deadline "${updatedDeadline.title}" has been marked as CANCELLED.`;
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

    // 5. Cancel or recalculate scheduled notifications
    if (isCancelled || isCompleted) {
      await prisma.scheduledNotification.deleteMany({
        where: {
          deadlineId: id,
          status: 'pending',
        },
      });
    } else if (
      input.dueDate !== undefined ||
      input.reminderSettings !== undefined ||
      input.departmentId !== undefined
    ) {
      await DeadlineService.scheduleNotificationsForDeadline(
        updatedDeadline.id,
        input.reminderSettings || [],
      );
    }

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
      throw new ForbiddenError(
        'You do not have permission to delete this deadline',
      );
    }

    if (deadline.googleEventId) {
      const { SyncService } = await import('./sync.service');
      SyncService.deleteDeadlineFromGoogleCalendar(
        user.id,
        deadline.googleEventId,
      ).catch((err: unknown) => {
        console.error(
          'Failed to delete calendar event for deleted deadline:',
          err,
        );
      });
    }

    await prisma.deadline.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Automatically generates pending scheduled reminders for all channels (email, push, in_app)
   */
  static async scheduleNotificationsForDeadline(
    deadlineId: string,
    reminderSettings?: string[],
  ) {
    try {
      const deadline = await prisma.deadline.findUnique({
        where: { id: deadlineId },
      });
      if (!deadline) return;

      // Clean existing pending reminders first
      await prisma.scheduledNotification.deleteMany({
        where: {
          deadlineId,
          status: 'pending',
        },
      });

      // Find all users in the target department
      const users = await prisma.user.findMany({
        where: { departmentId: deadline.departmentId },
      });

      const now = new Date();
      const dueDate = new Date(deadline.dueDate);

      const scheduledOffsets = [
        { days: 7, label: '7_DAYS_BEFORE', ms: 7 * 24 * 60 * 60 * 1000 },
        { days: 6, label: '6_DAYS_BEFORE', ms: 6 * 24 * 60 * 60 * 1000 },
        { days: 5, label: '5_DAYS_BEFORE', ms: 5 * 24 * 60 * 60 * 1000 },
        { days: 4, label: '4_DAYS_BEFORE', ms: 4 * 24 * 60 * 60 * 1000 },
        { days: 3, label: '3_DAYS_BEFORE', ms: 3 * 24 * 60 * 60 * 1000 },
        { days: 2, label: '2_DAYS_BEFORE', ms: 2 * 24 * 60 * 60 * 1000 },
        { days: 1, label: '1_DAY_BEFORE', ms: 1 * 24 * 60 * 60 * 1000 },
        { days: 0, label: 'DUE_DATE', ms: 0 },
        // Overdue offset (24 hours after due date)
        { days: -1, label: 'OVERDUE', ms: -24 * 60 * 60 * 1000 },
      ];

      const settings = reminderSettings || [];
      if (settings.includes('12_HOURS')) {
        scheduledOffsets.push({
          days: 0.5,
          label: '12_HOURS_BEFORE',
          ms: 12 * 60 * 60 * 1000,
        });
      }
      if (settings.includes('6_HOURS')) {
        scheduledOffsets.push({
          days: 0.25,
          label: '6_HOURS_BEFORE',
          ms: 6 * 60 * 60 * 1000,
        });
      }
      if (settings.includes('1_HOUR')) {
        scheduledOffsets.push({
          days: 1 / 24,
          label: '1_HOUR_BEFORE',
          ms: 1 * 60 * 60 * 1000,
        });
      }

      const rows: any[] = [];
      for (const offset of scheduledOffsets) {
        const scheduledFor = new Date(dueDate.getTime() - offset.ms);
        // Only schedule for future times
        if (scheduledFor > now) {
          for (const user of users) {
            rows.push({
              userId: user.id,
              deadlineId: deadline.id,
              channel: 'email',
              scheduledFor,
              status: 'pending',
            });
            rows.push({
              userId: user.id,
              deadlineId: deadline.id,
              channel: 'push',
              scheduledFor,
              status: 'pending',
            });
            rows.push({
              userId: user.id,
              deadlineId: deadline.id,
              channel: 'in_app',
              scheduledFor,
              status: 'pending',
            });
          }
        }
      }

      if (rows.length > 0) {
        await prisma.scheduledNotification.createMany({
          data: rows,
        });
        console.log(
          `Successfully scheduled ${rows.length} reminder notifications for deadline: "${deadline.title}"`,
        );
      }
    } catch (error) {
      console.error('Failed to schedule notifications for deadline:', error);
    }
  }
}
