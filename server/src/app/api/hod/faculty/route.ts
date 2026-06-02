import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  // Validate HOD or Admin permissions
  if (user.role !== 'HOD' && user.role !== 'ADMIN') {
    throw new ForbiddenError('HOD or Admin authorization required to access department logs');
  }

  // 1. Fetch department details
  const department = await prisma.department.findUnique({
    where: { id: user.departmentId },
  });

  // 2. Fetch all faculty members in this HOD's department
  const facultyMembers = await prisma.user.findMany({
    where: {
      departmentId: user.departmentId,
      role: 'FACULTY',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      employeeId: true,
      avatarUrl: true,
      isSuspended: true,
      createdAt: true,
    },
  });

  // 3. Fetch all department deadlines
  const departmentDeadlines = await prisma.deadline.findMany({
    where: { departmentId: user.departmentId },
    orderBy: { dueDate: 'asc' },
    include: {
      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  return sendSuccess({
    department,
    facultyCount: facultyMembers.length,
    faculty: facultyMembers,
    deadlines: departmentDeadlines,
  }, 'Department faculty and deadlines retrieved successfully');
});
