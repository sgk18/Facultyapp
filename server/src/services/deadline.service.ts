import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import { DeadlineInput } from '@/validators/deadline';
import { NotificationService } from '@/services/notification.service';

export class DeadlineService {
  /**
   * Lists deadlines based on role restrictions.
   * Faculty members are restricted to their own department.
   */
  static async listDeadlines(user: AuthenticatedUser, departmentId?: string) {
    const whereClause: any = {};

    if (user.role === 'FACULTY') {
      whereClause.departmentId = user.departmentId;
    } else if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    return prisma.deadline.findMany({
      where: whereClause,
      include: {
        createdBy: {
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
        createdBy: {
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

    // Role validation: Faculty can only see deadlines in their own department
    if (user.role === 'FACULTY' && deadline.departmentId !== user.departmentId) {
      throw new ForbiddenError('Access to this deadline is restricted to department members');
    }

    return deadline;
  }

  /**
   * Creates a deadline and notifies department members.
   */
  static async createDeadline(input: DeadlineInput, user: AuthenticatedUser) {
    // 1. If user is FACULTY, enforce department alignment
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
        createdById: user.id,
        isCompleted: input.isCompleted ?? false,
      },
      include: {
        createdBy: true,
        department: true,
      },
    });

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

    await NotificationService.notifyDepartment({
      departmentId: deadline.departmentId,
      title: `New Academic Deadline: ${deadline.title}`,
      body: `A new deadline has been set for the ${deadline.department.name} by Prof. ${deadline.createdBy.fullName}. Due: ${formattedDate}.`,
      deadlineTitle: deadline.title,
      dueDateStr: formattedDate,
      description: deadline.description,
      excludeUserId: user.id,
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

    // Access control: Faculty can only update deadlines in their own department
    if (user.role === 'FACULTY' && deadline.departmentId !== user.departmentId) {
      throw new ForbiddenError('You do not have permission to modify this deadline');
    }

    // Enforce that faculty cannot update target department to a foreign one
    if (user.role === 'FACULTY' && input.departmentId && input.departmentId !== user.departmentId) {
      throw new ForbiddenError('You cannot transfer deadlines to other departments');
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
        createdBy: true,
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

    await NotificationService.notifyDepartment({
      departmentId: updatedDeadline.departmentId,
      title: `Updated Academic Deadline: ${updatedDeadline.title}`,
      body: `The deadline "${updatedDeadline.title}" has been modified. New Due Date: ${formattedDate}.`,
      deadlineTitle: updatedDeadline.title,
      dueDateStr: formattedDate,
      description: updatedDeadline.description,
      excludeUserId: user.id,
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

    // Access control
    if (user.role === 'FACULTY' && deadline.departmentId !== user.departmentId) {
      throw new ForbiddenError('You do not have permission to delete this deadline');
    }

    await prisma.deadline.delete({
      where: { id },
    });

    return true;
  }
}
