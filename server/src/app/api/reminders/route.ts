import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, NotFoundError, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET retrieve user's reminders
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const pageStr = searchParams.get('page');

  if (pageStr) {
    const page = parseInt(pageStr, 10) || 1;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const [reminders, total] = await Promise.all([
      prisma.deadline.findMany({
        where: { ownerId: user.id, reminderEnabled: true },
        skip,
        take: limit,
        orderBy: { reminderTime: 'asc' },
      }),
      prisma.deadline.count({ where: { ownerId: user.id, reminderEnabled: true } }),
    ]);

    const items = reminders.map((r) => ({
      id: r.id,
      userId: r.ownerId,
      title: r.title,
      description: r.description,
      reminderTime: r.reminderTime,
      repeatType: r.repeatType || 'NONE',
      status: r.status,
      createdAt: r.createdAt,
    }));

    return sendSuccess({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    }, 'Reminders retrieved successfully');
  }

  const reminders = await prisma.deadline.findMany({
    where: { ownerId: user.id, reminderEnabled: true },
    orderBy: { reminderTime: 'asc' },
  });

  const items = reminders.map((r) => ({
    id: r.id,
    userId: r.ownerId,
    title: r.title,
    description: r.description,
    reminderTime: r.reminderTime,
    repeatType: r.repeatType || 'NONE',
    status: r.status,
    createdAt: r.createdAt,
  }));

  return sendSuccess(items, 'Reminders retrieved successfully');
});

/**
 * POST create a new reminder (saved as a Deadline with reminder_enabled = true)
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.title || !body.reminderTime) {
    throw new ValidationError('title and reminderTime are required fields');
  }

  const reminderTime = new Date(body.reminderTime);
  if (isNaN(reminderTime.getTime())) {
    throw new ValidationError('Invalid date format for reminderTime');
  }

  // Fetch the user's department to link the new consolidated deadline
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userRecord) {
    throw new NotFoundError('User profile not found');
  }

  const reminder = await prisma.deadline.create({
    data: {
      ownerId: user.id,
      departmentId: userRecord.departmentId,
      title: body.title,
      description: body.description || null,
      dueDate: reminderTime, // consolidated due_date is set to the reminder time
      reminderEnabled: true,
      reminderTime,
      repeatType: body.repeatType || 'NONE',
      status: 'PENDING',
      syncToCalendar: body.addToGoogleCalendar || false,
    },
  });

  // Sync new reminder to Google Calendar if requested
  if (reminder.syncToCalendar) {
    const { SyncService } = require('@/services/sync.service');
    SyncService.pushDeadlineToGoogleCalendar(reminder.id).catch((err: any) => {
      console.error('Failed to push new reminder to Google Calendar:', err);
    });
  }

  const mappedReminder = {
    id: reminder.id,
    userId: reminder.ownerId,
    title: reminder.title,
    description: reminder.description,
    reminderTime: reminder.reminderTime,
    repeatType: reminder.repeatType || 'NONE',
    status: reminder.status,
    createdAt: reminder.createdAt,
  };

  return sendSuccess(mappedReminder, 'Reminder created successfully');
});

/**
 * PATCH update reminder status
 */
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.id || !body.status) {
    throw new ValidationError('id and status are required fields');
  }

  const allowedStatuses = ['PENDING', 'SENT', 'DISMISSED', 'COMPLETED', 'CANCELLED'];
  if (!allowedStatuses.includes(body.status)) {
    throw new ValidationError(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  const reminder = await prisma.deadline.findUnique({
    where: { id: body.id },
  });

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.ownerId !== user.id) {
    throw new ForbiddenError('You do not own this reminder');
  }

  const updated = await prisma.deadline.update({
    where: { id: body.id },
    data: { 
      status: body.status,
      isCompleted: body.status === 'COMPLETED',
    },
  });

  const mappedReminder = {
    id: updated.id,
    userId: updated.ownerId,
    title: updated.title,
    description: updated.description,
    reminderTime: updated.reminderTime,
    repeatType: updated.repeatType || 'NONE',
    status: updated.status,
    createdAt: updated.createdAt,
  };

  return sendSuccess(mappedReminder, 'Reminder updated successfully');
});

/**
 * DELETE delete a reminder
 */
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('id query parameter is required');
  }

  const reminder = await prisma.deadline.findUnique({
    where: { id },
  });

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.ownerId !== user.id) {
    throw new ForbiddenError('You do not own this reminder');
  }

  if (reminder.googleEventId) {
    const { SyncService } = require('@/services/sync.service');
    SyncService.deleteDeadlineFromGoogleCalendar(user.id, reminder.googleEventId).catch((err: any) => {
      console.error('Failed to delete reminder from Google Calendar:', err);
    });
  }

  await prisma.deadline.delete({
    where: { id },
  });

  return sendSuccess(null, 'Reminder deleted successfully');
});
