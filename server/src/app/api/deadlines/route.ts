import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { DeadlineService } from '@/services/deadline.service';
import { deadlineSchema } from '@/validators/deadline';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId') || undefined;
  
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
