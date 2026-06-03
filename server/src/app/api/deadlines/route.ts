import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { DeadlineService } from '@/services/deadline.service';
import { deadlineSchema } from '@/validators/deadline';
import { prisma } from '@/lib/prisma';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId') || undefined;
  
  const pageStr = searchParams.get('page');
  if (pageStr) {
    const page = parseInt(pageStr, 10) || 1;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (user.role === 'FACULTY') {
      whereClause.departmentId = user.departmentId;
    } else if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    const [deadlines, total] = await Promise.all([
      prisma.deadline.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          department: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.deadline.count({ where: whereClause }),
    ]);

    return sendSuccess({
      items: deadlines,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    }, 'Deadlines retrieved successfully');
  }

  const deadlines = await DeadlineService.listDeadlines(user, departmentId);
  return sendSuccess(deadlines, 'Deadlines retrieved successfully');
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();
  const result = deadlineSchema.safeParse(body);
  
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message)
    );
  }
  
  const deadline = await DeadlineService.createDeadline(result.data, user);
  return sendSuccess(deadline, 'Deadline created successfully', 201);
});
