import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireRoles } from '@/middleware/role.middleware';
import { prisma } from '@/lib/prisma';
import { userRoleUpdateSchema } from '@/validators/admin';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const activeUser = await requireAuth(req);
  
  // Enforce role permission hierarchy: Only admins can manage roles
  requireRoles(activeUser, ['ADMIN']);

  const body = await req.json();
  const result = userRoleUpdateSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message)
    );
  }

  const { userId } = result.data;

  // Prevent self-demotion to avoid losing admin lockouts
  if (userId === activeUser.id) {
    throw new ForbiddenError('You cannot demote or modify your own role');
  }

  // Find target user
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new ValidationError('Target user not found');
  }

  // Update target user to FACULTY
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: 'FACULTY' },
    include: { department: true },
  });

  return sendSuccess(updatedUser, `Successfully demoted ${updatedUser.fullName} to FACULTY`);
});
