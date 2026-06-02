import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { DESIGN_TOKENS } from '@/utils/branding';

export const GET = withErrorHandler(async (req: NextRequest) => {
  return sendSuccess(DESIGN_TOKENS, 'Branding details retrieved successfully');
});
