import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, ForbiddenError, NotFoundError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';
import { AuditService } from '@/services/audit.service';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const admin = await requireAuth(req);

  // Validate administrator privileges
  if (admin.role !== 'ADMIN') {
    throw new ForbiddenError('Administrator privileges required');
  }

  const body = await req.json();
  const { userId, suspend } = body;

  if (!userId || typeof suspend !== 'boolean') {
    throw new ValidationError('userId and suspend (boolean) are required fields');
  }

  // Prevent self-suspension
  if (userId === admin.id) {
    throw new ValidationError('Administrators cannot suspend their own accounts');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new NotFoundError('Target user not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: suspend },
  });

  // Log action to Audit Logs
  const actionText = suspend ? 'SUSPEND_USER' : 'UNSUSPEND_USER';
  await AuditService.logAction(admin.id, actionText, targetUser.email);

  return sendSuccess(updatedUser, `User has been successfully ${suspend ? 'suspended' : 'reinstated'}`);
});
