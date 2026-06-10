import { NextRequest } from 'next/server';
import { verifyAuth, AuthenticatedUser } from '@/lib/auth';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';

/**
 * Validates that a user is authenticated.
 * Throws UnauthorizedError if token is invalid or missing.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<AuthenticatedUser> {
  const user = await verifyAuth(req);
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}

/**
 * Validates that a user has at least FACULTY privileges.
 * Since all registered users have at least the FACULTY role, this functions identically to requireAuth.
 */
export async function requireFaculty(
  req: NextRequest,
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  return user;
}

/**
 * Validates HOD or Admin permissions.
 * Throws ForbiddenError if the role is not HOD or ADMIN.
 */
export async function requireHOD(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  if (user.role !== 'HOD' && user.role !== 'ADMIN') {
    throw new ForbiddenError('HOD or Admin authorization required');
  }
  return user;
}

/**
 * Validates Administrator permissions.
 * Throws ForbiddenError if the role is not ADMIN.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Administrator authorization required');
  }
  return user;
}
