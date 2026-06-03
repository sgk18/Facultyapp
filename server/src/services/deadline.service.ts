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

    // 2. Mock Google Calendar sync trigger
    if (deadline.syncToCalendar) {
      const { SyncService } = require('./sync.service');
      SyncService.syncCalendarForUser(user.id).catch((err: any) => {
        console.error('Failed to sync new deadline to Google Calendar:', err);
      });
    }

    // 3. Send creation notification
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

    // Mock Google Calendar sync trigger
    if (updatedDeadline.syncToCalendar) {
      const { SyncService } = require('./sync.service');
      SyncService.syncCalendarForUser(user.id).catch((err: any) => {
        console.error('Failed to sync updated deadline to Google Calendar:', err);
      });
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

    await prisma.deadline.delete({
      where: { id },
    });

    return true;
  }
}
