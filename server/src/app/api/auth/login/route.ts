import { NextRequest } from 'next/server';
import { withErrorHandler, AppError } from '@/utils/errors';

export const POST = withErrorHandler(async (req: NextRequest) => {
  throw new AppError(
    'Password-based authentication has been permanently disabled. Please sign in using Google OAuth.',
    410,
  );
});
