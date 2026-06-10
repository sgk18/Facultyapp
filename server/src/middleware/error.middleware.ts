import { NextResponse } from 'next/server';
import { AppError } from '@/utils/errors';

export { withErrorHandler } from '@/utils/errors';

/**
 * Centered error response builder utility for standardizing manual catch blocks
 */
export function formatErrorResponse(error: any): NextResponse {
  console.error('API Endpoint Error caught in handler:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details,
      },
      { status: error.statusCode },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      details: [
        error instanceof Error ? error.message : 'Internal Server Error',
      ],
    },
    { status: 500 },
  );
}
