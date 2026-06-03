import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const activeUser = await requireAdmin(req);

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  const [users, total, totalFaculty, totalHods] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      include: {
        department: true,
      },
      orderBy: { fullName: 'asc' },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'FACULTY' } }),
    prisma.user.count({ where: { role: 'HOD' } }),
  ]);

  return sendSuccess({
    items: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      totalFaculty,
      totalHods,
    }
  }, 'Admin users list retrieved successfully');
});
