import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { DeadlineService } from '@/services/deadline.service';
import { deadlineSchema } from '@/validators/deadline';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandler(async (req: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  const user = await requireAuth(req);
  
  const deadline = await DeadlineService.getDeadlineById(id, user);
  return sendSuccess(deadline, 'Deadline retrieved successfully');
});

export const PATCH = withErrorHandler(async (req: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  const user = await requireAuth(req);
  
  const body = await req.json();
  const result = deadlineSchema.partial().safeParse(body);
  
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message)
    );
  }
  
  const deadline = await DeadlineService.updateDeadline(id, result.data, user);
  return sendSuccess(deadline, 'Deadline updated successfully');
});

export const DELETE = withErrorHandler(async (req: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  const user = await requireAuth(req);
  
  await DeadlineService.deleteDeadline(id, user);
  return sendSuccess(null, 'Deadline deleted successfully');
});
