import { Role } from '@prisma/client';
import { AuthenticatedUser } from '@/lib/auth';
import { ForbiddenError } from '@/utils/errors';

/**
 * Asserts that the authenticated user has one of the allowed roles.
 * Throws ForbiddenError if the role check fails.
 */
export function requireRoles(
  user: AuthenticatedUser,
  allowedRoles: Role[],
): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      'You do not have permission to access this resource',
    );
  }
}
