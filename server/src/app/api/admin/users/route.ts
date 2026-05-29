import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireRoles } from '@/middleware/role.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const activeUser = await requireAuth(req);
  
  // Enforce role permission: Only admin can access detailed administrative user feeds
  requireRoles(activeUser, ['ADMIN']);

  const users = await prisma.user.findMany({
    include: {
      department: true,
    },
    orderBy: { fullName: 'asc' },
  });

  return sendSuccess(users, 'Admin users list retrieved successfully');
});
