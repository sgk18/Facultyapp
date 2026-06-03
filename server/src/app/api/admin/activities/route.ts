import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Enforce admin authorization check
  await requireAdmin(req);

  const { searchParams } = new URL(req.url);
  const dPage = parseInt(searchParams.get('dPage') || '1', 10);
  const dLimit = parseInt(searchParams.get('dLimit') || '10', 10);
  const dSkip = (dPage - 1) * dLimit;

  const rPage = parseInt(searchParams.get('rPage') || '1', 10);
  const rLimit = parseInt(searchParams.get('rLimit') || '10', 10);
  const rSkip = (rPage - 1) * rLimit;

  // Fetch deadlines and reminders along with count in parallel
  const [deadlines, totalDeadlines, reminders, totalReminders] = await Promise.all([
    prisma.deadline.findMany({
      skip: dSkip,
      take: dLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    }),
    prisma.deadline.count(),
    prisma.reminder.findMany({
      skip: rSkip,
      take: rLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),
    prisma.reminder.count(),
  ]);

  return sendSuccess(
    {
      deadlines: {
        items: deadlines,
        pagination: {
          page: dPage,
          limit: dLimit,
          total: totalDeadlines,
          pages: Math.ceil(totalDeadlines / dLimit),
        },
      },
      reminders: {
        items: reminders,
        pagination: {
          page: rPage,
          limit: rLimit,
          total: totalReminders,
          pages: Math.ceil(totalReminders / rLimit),
        },
      },
    },
    'User activity logs retrieved successfully'
  );
});
