import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const activeUser = await requireAdmin(req);

  const users = await prisma.user.findMany({
    include: {
      department: true,
    },
    orderBy: { fullName: 'asc' },
  });

  return sendSuccess(users, 'Admin users list retrieved successfully');
});
