import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  sendSuccess,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET retrieve user's calendar events
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const events = await prisma.deadline.findMany({
    where: { ownerId: user.id, syncToCalendar: true },
    orderBy: { dueDate: 'asc' },
  });

  const items = events.map((e) => ({
    id: e.id,
    userId: e.ownerId,
    title: e.title,
    description: e.description,
    startTime: e.dueDate,
    endTime: new Date(e.dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
    eventType: 'DEADLINE',
    source: e.googleEventId ? 'GOOGLE' : 'APP',
    createdAt: e.createdAt,
  }));

  return sendSuccess(items, 'Calendar events retrieved successfully');
});

/**
 * POST create a new in-app calendar event (saved as a Deadline with sync_to_calendar = true)
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.title || !body.startTime || !body.endTime) {
    throw new ValidationError(
      'title, startTime, and endTime are required fields',
    );
  }

  const startTime = new Date(body.startTime);
  if (isNaN(startTime.getTime())) {
    throw new ValidationError('Invalid date format for startTime');
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userRecord) {
    throw new NotFoundError('User profile not found');
  }

  const event = await prisma.deadline.create({
    data: {
      ownerId: user.id,
      departmentId: userRecord.departmentId,
      title: body.title,
      description: body.description || null,
      dueDate: startTime, // consolidated due_date is set to the start time
      syncToCalendar: true,
    },
  });

  // Sync new event to Google Calendar
  const { SyncService } = require('@/services/sync.service');
  SyncService.pushDeadlineToGoogleCalendar(event.id).catch((err: any) => {
    console.error('Failed to push new event to Google Calendar:', err);
  });

  const mappedEvent = {
    id: event.id,
    userId: event.ownerId,
    title: event.title,
    description: event.description,
    startTime: event.dueDate,
    endTime: new Date(event.dueDate.getTime() + 60 * 60 * 1000),
    eventType: body.eventType || 'GENERAL',
    source: 'APP',
    createdAt: event.createdAt,
  };

  return sendSuccess(mappedEvent, 'Calendar event created successfully');
});

/**
 * PATCH update calendar event
 */
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (!body.id) {
    throw new ValidationError('id is a required field');
  }

  const event = await prisma.deadline.findUnique({
    where: { id: body.id },
  });

  if (!event) {
    throw new NotFoundError('Calendar event not found');
  }

  if (event.ownerId !== user.id) {
    throw new ForbiddenError('You do not own this calendar event');
  }

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.startTime !== undefined)
    updateData.dueDate = new Date(body.startTime);

  const updated = await prisma.deadline.update({
    where: { id: body.id },
    data: updateData,
  });

  // Sync updated event to Google Calendar
  const { SyncService } = require('@/services/sync.service');
  SyncService.pushDeadlineToGoogleCalendar(updated.id).catch((err: any) => {
    console.error('Failed to push updated event to Google Calendar:', err);
  });

  const mappedEvent = {
    id: updated.id,
    userId: updated.ownerId,
    title: updated.title,
    description: updated.description,
    startTime: updated.dueDate,
    endTime: new Date(updated.dueDate.getTime() + 60 * 60 * 1000),
    eventType: body.eventType || 'GENERAL',
    source: updated.googleEventId ? 'GOOGLE' : 'APP',
    createdAt: updated.createdAt,
  };

  return sendSuccess(mappedEvent, 'Calendar event updated successfully');
});

/**
 * DELETE delete calendar event
 */
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('id query parameter is required');
  }

  const event = await prisma.deadline.findUnique({
    where: { id },
  });

  if (!event) {
    throw new NotFoundError('Calendar event not found');
  }

  if (event.ownerId !== user.id) {
    throw new ForbiddenError('You do not own this calendar event');
  }

  if (event.googleEventId) {
    const { SyncService } = require('@/services/sync.service');
    SyncService.deleteDeadlineFromGoogleCalendar(
      user.id,
      event.googleEventId,
    ).catch((err: any) => {
      console.error(
        'Failed to delete calendar event for deleted deadline:',
        err,
      );
    });
  }

  await prisma.deadline.delete({
    where: { id },
  });

  return sendSuccess(null, 'Calendar event deleted successfully');
});
