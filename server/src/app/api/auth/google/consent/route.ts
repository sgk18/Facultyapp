import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET connection status and sync consent choices
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const account = await prisma.googleAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    return sendSuccess({ connected: false, syncGmail: false, syncCalendar: false }, 'Google account not connected');
  }

  return sendSuccess({
    connected: true,
    syncGmail: account.syncGmail,
    syncCalendar: account.syncCalendar,
    connectedAt: account.connectedAt,
  }, 'Consent status retrieved');
});

/**
 * POST update sync consent preferences
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();

  if (typeof body.syncGmail !== 'boolean' || typeof body.syncCalendar !== 'boolean') {
    throw new ValidationError('syncGmail and syncCalendar must be boolean fields');
  }

  const account = await prisma.googleAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    throw new ValidationError('Google account is not connected. Connect via OAuth first.');
  }

  const updated = await prisma.googleAccount.update({
    where: { userId: user.id },
    data: {
      syncGmail: body.syncGmail,
      syncCalendar: body.syncCalendar,
    },
  });

  return sendSuccess({
    syncGmail: updated.syncGmail,
    syncCalendar: updated.syncCalendar,
  }, 'Sync consent options updated successfully');
});

/**
 * DELETE disconnect Google account and remove external calendar sync events
 */
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const account = await prisma.googleAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    throw new ValidationError('No connected Google account found');
  }

  // 1. Delete the google account record (will cascade if configured, but let's delete explicitly)
  await prisma.googleAccount.delete({
    where: { userId: user.id },
  });

  // 2. Remove any calendar events downloaded from Google to keep internal db clean
  await prisma.calendarEvent.deleteMany({
    where: {
      userId: user.id,
      source: 'GOOGLE',
    },
  });

  return sendSuccess(null, 'Google account disconnected and sync events cleaned up');
});
