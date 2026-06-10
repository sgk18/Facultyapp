import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET connection status and sync consent choices
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userRecord || !userRecord.googleId) {
    return sendSuccess(
      { connected: false, syncGmail: false, syncCalendar: false },
      'Google account not connected',
    );
  }

  return sendSuccess(
    {
      connected: true,
      syncGmail: userRecord.gmailSyncEnabled,
      syncCalendar: userRecord.calendarSyncEnabled,
      connectedAt: userRecord.createdAt,
    },
    'Consent status retrieved',
  );
});

/**
 * POST update sync consent preferences
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (
    typeof body.syncGmail !== 'boolean' ||
    typeof body.syncCalendar !== 'boolean'
  ) {
    throw new ValidationError(
      'syncGmail and syncCalendar must be boolean fields',
    );
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userRecord || !userRecord.googleId) {
    throw new ValidationError(
      'Google account is not connected. Connect via OAuth first.',
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      gmailSyncEnabled: body.syncGmail,
      calendarSyncEnabled: body.syncCalendar,
    },
  });

  return sendSuccess(
    {
      syncGmail: updated.gmailSyncEnabled,
      syncCalendar: updated.calendarSyncEnabled,
    },
    'Sync consent options updated successfully',
  );
});

/**
 * DELETE disconnect Google account and remove external calendar sync events
 */
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userRecord || !userRecord.googleId) {
    throw new ValidationError('No connected Google account found');
  }

  // 1. Clear Google connection columns from the user model
  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleId: null,
      gmailSyncEnabled: false,
      calendarSyncEnabled: false,
      googleAccessToken: null,
      googleRefreshToken: null,
    },
  });

  // 2. Update deadlines to disable calendar sync and clear event association
  await prisma.deadline.updateMany({
    where: {
      ownerId: user.id,
      googleEventId: { not: null },
    },
    data: {
      syncToCalendar: false,
      googleEventId: null,
    },
  });

  return sendSuccess(
    null,
    'Google account disconnected and sync events cleaned up',
  );
});
