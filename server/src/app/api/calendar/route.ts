import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, NotFoundError, ForbiddenError } from '@/utils/errors';
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
      description: body.description || null,
      startTime,
      endTime,
      eventType: body.eventType || 'GENERAL',
      source: 'APP',
    },
  });

  // Trigger calendar sync asynchronously to push this event to Google Calendar if configured
  SyncService.syncCalendarForUser(user.id).catch((err) => {
    console.error('Asynchronous Google Calendar sync failed:', err);
  });

  return sendSuccess(event, 'Calendar event created successfully');
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.id) {
    throw new ValidationError('id is a required field');
  }

  const event = await prisma.calendarEvent.findUnique({
    where: { id: body.id },
  });

  if (!event) {
    throw new NotFoundError('Calendar event not found');
  }

  if (event.userId !== user.id) {
    throw new ForbiddenError('You do not own this calendar event');
  }

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime);
  if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime);
  if (body.eventType !== undefined) updateData.eventType = body.eventType;

  const updated = await prisma.calendarEvent.update({
    where: { id: body.id },
    data: updateData,
  });

  return sendSuccess(updated, 'Calendar event updated successfully');
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('id query parameter is required');
  }

  const event = await prisma.calendarEvent.findUnique({
    where: { id },
  });

  if (!event) {
    throw new NotFoundError('Calendar event not found');
  }

  if (event.userId !== user.id) {
    throw new ForbiddenError('You do not own this calendar event');
  }

  await prisma.calendarEvent.delete({
    where: { id },
  });

  return sendSuccess(null, 'Calendar event deleted successfully');
});
