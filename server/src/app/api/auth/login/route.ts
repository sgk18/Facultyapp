import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { AuthService } from '@/services/auth.service';
import { loginSchema } from '@/validators/auth';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message)
    );
  }

  const authSession = await AuthService.login(result.data);
  return sendSuccess(authSession, 'Login successful');
});
