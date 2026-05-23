import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { AuthService } from '@/services/auth.service';

export const POST = withErrorHandler(async (req: NextRequest) => {
  await AuthService.logout();
  return sendSuccess(null, 'Logged out successfully');
});
