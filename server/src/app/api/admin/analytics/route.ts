import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ForbiddenError } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin(req);

  // Aggregate platform metrics
  const [
    totalFaculty,
    totalHods,
    activeUsers,
    pendingDeadlines,
    upcomingEvents,
    connectedGmailSyncs
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'FACULTY' } }),
    prisma.user.count({ where: { role: 'HOD' } }),
    prisma.user.count({ where: { isSuspended: false } }),
    prisma.deadline.count({ where: { isCompleted: false } }),
    prisma.calendarEvent.count({ where: { startTime: { gte: new Date() } } }),
    prisma.googleAccount.count({ where: { syncGmail: true } }),
  ]);

  return sendSuccess({
    totalFaculty,
    totalHods,
    activeUsers,
    pendingDeadlines,
    upcomingEvents,
    connectedGmailSyncs,
  }, 'Admin analytics data retrieved successfully');
});
