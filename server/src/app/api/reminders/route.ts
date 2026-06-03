import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, NotFoundError, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET retrieve user's reminders
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { reminderTime: 'asc' },
  });

  return sendSuccess(reminders, 'Reminders retrieved successfully');
});

/**
 * POST create a new reminder
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

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title: body.title,
      description: body.description || null,
      reminderTime,
      repeatType: body.repeatType || 'NONE',
      status: 'PENDING',
    },
  });

  return sendSuccess(reminder, 'Reminder created successfully');
});

/**
 * PATCH update reminder status (e.g. dismissing a reminder)
 */
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.id || !body.status) {
    throw new ValidationError('id and status are required fields');
  }

  const allowedStatuses = ['PENDING', 'SENT', 'DISMISSED'];
  if (!allowedStatuses.includes(body.status)) {
    throw new ValidationError(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  const reminder = await prisma.reminder.findUnique({
    where: { id: body.id },
  });

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.userId !== user.id) {
    throw new ForbiddenError('You do not own this reminder');
  }

  const updated = await prisma.reminder.update({
    where: { id: body.id },
    data: { status: body.status },
  });

  return sendSuccess(updated, 'Reminder updated successfully');
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('id query parameter is required');
  }

  const reminder = await prisma.reminder.findUnique({
    where: { id },
  });

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.userId !== user.id) {
    throw new ForbiddenError('You do not own this reminder');
  }

  await prisma.reminder.delete({
    where: { id },
  });

  return sendSuccess(null, 'Reminder deleted successfully');
});
