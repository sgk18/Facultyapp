import { NextRequest } from 'next/server';
import { verifyAuth, AuthenticatedUser } from '@/lib/auth';
import { UnauthorizedError } from '@/utils/errors';

/**
 * Validates the authentication of the incoming request.
 * Throws UnauthorizedError if invalid.
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await verifyAuth(req);
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}
