import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';
import { DeadlineInput } from '@/validators/deadline';
import { NotificationService } from '@/services/notification.service';

export class DeadlineService {
  /**
   * Lists deadlines based on role restrictions.
   * Faculty members are restricted to their own department.
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
   * Creates a deadline and notifies department members.
   */
  static async createDeadline(input: DeadlineInput, user: AuthenticatedUser) {
    // Enforce department alignment for faculty members if needed, otherwise verify department
    if (user.role === 'FACULTY' && input.departmentId !== user.departmentId) {
      throw new ForbiddenError('You can only create deadlines within your own department');
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!department) {
      throw new NotFoundError('Target department not found');
    }

    // 2. Create the deadline
    const deadline = await prisma.deadline.create({
      data: {
        title: input.title,
        description: input.description,
        dueDate: new Date(input.dueDate),
        priority: input.priority,
        departmentId: input.departmentId,
        ownerId: user.id,
        isCompleted: input.isCompleted ?? false,
      },
      include: {
        owner: true,
        department: true,
      },
    });

    // Handle Google Calendar sync if requested
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

    // 3. Orchestrate notifications asynchronously
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
   * Updates an existing deadline and triggers edit alerts.
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
    if (input.isCompleted !== undefined) updateData.isCompleted = input.isCompleted;

    const updatedDeadline = await prisma.deadline.update({
      where: { id },
      data: updateData,
      include: {
        owner: true,
        department: true,
      },
    });

    // Notify of update
    const formattedDate = new Date(updatedDeadline.dueDate).toLocaleDateString('en-US', {
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
      title: `Updated Academic Deadline: ${updatedDeadline.title}`,
      body: `The private deadline "${updatedDeadline.title}" has been modified. New Due Date: ${formattedDate}.`,
      deadlineTitle: updatedDeadline.title,
      dueDateStr: formattedDate,
      description: updatedDeadline.description,
      type: 'DEADLINE',
      relatedDeadlineId: updatedDeadline.id,
    });

    return updatedDeadline;
  }

  /**
   * Deletes a deadline after verifying access permission.
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
