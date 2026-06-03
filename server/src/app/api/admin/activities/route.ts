import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Enforce admin authorization check
  await requireAdmin(req);

  // 1. Fetch all created deadlines
  const deadlines = await prisma.deadline.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
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
  });

  // 2. Fetch all reminders
  const reminders = await prisma.reminder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  return sendSuccess(
    { deadlines, reminders },
    'User activity logs retrieved successfully'
  );
});
