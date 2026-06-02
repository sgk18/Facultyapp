import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';
import { SyncService } from '@/services/sync.service';

/**
 * GET retrieve user's calendar events
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id },
    orderBy: { startTime: 'asc' },
  });

  return sendSuccess(events, 'Calendar events retrieved successfully');
});

/**
 * POST create a new in-app calendar event (pushes to Google if enabled)
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.title || !body.startTime || !body.endTime) {
    throw new ValidationError('title, startTime, and endTime are required fields');
  }

  const startTime = new Date(body.startTime);
  const endTime = new Date(body.endTime);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new ValidationError('Invalid date format for startTime or endTime');
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: body.title,
      startTime,
      endTime,
      source: 'APP',
    },
  });

  // Trigger calendar sync asynchronously to push this event to Google Calendar if configured
  SyncService.syncCalendarForUser(user.id).catch((err) => {
    console.error('Asynchronous Google Calendar sync failed:', err);
  });

  return sendSuccess(event, 'Calendar event created successfully');
});
