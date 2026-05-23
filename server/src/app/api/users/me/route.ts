import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { UserService } from '@/services/user.service';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const authUser = await requireAuth(req);
  const profile = await UserService.getProfile(authUser.id);
  return sendSuccess(profile, 'Profile retrieved successfully');
});
