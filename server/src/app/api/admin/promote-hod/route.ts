import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  sendSuccess,
  ValidationError,
  ForbiddenError,
} from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';
import { userRoleUpdateSchema } from '@/validators/admin';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const activeUser = await requireAdmin(req);

  const body = await req.json();
  const result = userRoleUpdateSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message),
    );
  }

  const { userId } = result.data;

  // Prevent self-promotion or self-modification to avoid privilege locks
  if (userId === activeUser.id) {
    throw new ForbiddenError('You cannot promote or modify your own role');
  }

  // Find target user
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new ValidationError('Target user not found');
  }

  // Update target user to HOD
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: 'HOD' },
    include: { department: true },
  });

  return sendSuccess(
    updatedUser,
    `Successfully promoted ${updatedUser.fullName} to HOD`,
  );
});
