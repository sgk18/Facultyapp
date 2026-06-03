import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, NotFoundError, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';
import { GoogleClient } from '@/lib/google';

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
      prisma.reminder.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { reminderTime: 'asc' },
      }),
      prisma.reminder.count({ where: { userId: user.id } }),
    ]);

    return sendSuccess({
      items: reminders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    }, 'Reminders retrieved successfully');
  }

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

  // Handle Google Calendar sync if requested
  if (body.addToGoogleCalendar) {
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
        title: `Reminder: ${reminder.title}`,
        description: reminder.description || 'Academic Reminder',
        startTime: reminder.reminderTime,
        endTime: new Date(reminder.reminderTime.getTime() + 30 * 60 * 1000), // 30 mins duration
        eventType: 'REMINDER',
        source: 'APP',
      },
    });

    const { SyncService } = require('@/services/sync.service');
    SyncService.syncCalendarForUser(user.id).catch((err: any) => {
      console.error('Failed to sync new reminder to Google Calendar:', err);
    });
  }

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

  const allowedStatuses = ['PENDING', 'SENT', 'DISMISSED', 'COMPLETED', 'CANCELLED'];
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

  // If status is updated to CANCELLED, remove linked Google Calendar event
  if (body.status === 'CANCELLED') {
    const calendarEvent = await prisma.calendarEvent.findFirst({
      where: {
        userId: user.id,
        eventType: 'REMINDER',
        title: `Reminder: ${reminder.title}`,
        startTime: reminder.reminderTime,
      },
    });

    if (calendarEvent) {
      if (calendarEvent.googleEventId) {
        try {
          const { SyncService } = require('@/services/sync.service');
          const token = await SyncService.getActiveAccessToken(user.id);
          if (token) {
            await GoogleClient.deleteCalendarEvent(token, calendarEvent.googleEventId);
          }
        } catch (err) {
          console.error('Failed to delete Google Calendar event:', err);
        }
      }

      await prisma.calendarEvent.delete({
        where: { id: calendarEvent.id },
      }).catch((err) => {
        console.error('Failed to delete local CalendarEvent record:', err);
      });
    }
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

  // Find linked calendar event if any
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: {
      userId: user.id,
      eventType: 'REMINDER',
      title: `Reminder: ${reminder.title}`,
      startTime: reminder.reminderTime,
    },
  });

  if (calendarEvent) {
    if (calendarEvent.googleEventId) {
      try {
        const { SyncService } = require('@/services/sync.service');
        const token = await SyncService.getActiveAccessToken(user.id);
        if (token) {
          await GoogleClient.deleteCalendarEvent(token, calendarEvent.googleEventId);
        }
      } catch (err) {
        console.error('Failed to delete Google Calendar event:', err);
      }
    }

    await prisma.calendarEvent.delete({
      where: { id: calendarEvent.id },
    }).catch((err) => {
      console.error('Failed to delete local CalendarEvent record:', err);
    });
  }

  await prisma.reminder.delete({
    where: { id },
  });

  return sendSuccess(null, 'Reminder deleted successfully');
});
