import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Enforce admin authorization
  await requireAdmin(req);

  // 1. Fetch aggregate statistics
  const [totalCount, pendingCount, sentCount, failedCount] = await Promise.all([
    prisma.scheduledNotification.count(),
    prisma.scheduledNotification.count({ where: { status: 'pending' } }),
    prisma.scheduledNotification.count({ where: { status: 'sent' } }),
    prisma.scheduledNotification.count({ where: { status: 'failed' } }),
  ]);

  // 2. Fetch channel-specific breakdowns
  const [
    emailPending,
    emailSent,
    emailFailed,
    pushPending,
    pushSent,
    pushFailed,
    inAppPending,
    inAppSent,
    inAppFailed,
  ] = await Promise.all([
    prisma.scheduledNotification.count({
      where: { channel: 'email', status: 'pending' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'email', status: 'sent' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'email', status: 'failed' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'push', status: 'pending' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'push', status: 'sent' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'push', status: 'failed' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'in_app', status: 'pending' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'in_app', status: 'sent' },
    }),
    prisma.scheduledNotification.count({
      where: { channel: 'in_app', status: 'failed' },
    }),
  ]);

  // 3. Fetch latest 50 logs for the feed
  const logs = await prisma.scheduledNotification.findMany({
    take: 50,
    orderBy: { scheduledFor: 'desc' },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      deadline: {
        select: {
          title: true,
        },
      },
    },
  });

  return sendSuccess(
    {
      summary: {
        total: totalCount,
        pending: pendingCount,
        sent: sentCount,
        failed: failedCount,
      },
      channels: {
        email: {
          pending: emailPending,
          sent: emailSent,
          failed: emailFailed,
        },
        push: {
          pending: pushPending,
          sent: pushSent,
          failed: pushFailed,
        },
        in_app: {
          pending: inAppPending,
          sent: inAppSent,
          failed: inAppFailed,
        },
      },
      logs,
    },
    'Notification analytics retrieved successfully',
  );
});
