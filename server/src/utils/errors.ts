import { NextResponse } from 'next/server';

export class AppError extends Error {
  public statusCode: number;
  public details: string[];

  constructor(message: string, statusCode = 500, details: string[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Failed', details: string[] = []) {
    super(message, 400, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

/**
 * Higher-order function to wrap route handlers with type-safe error trapping.
 * Formats API errors matching the { success: false, error: string, details: [] } payload rules.
 */
export function withErrorHandler(
  handler: (req: any, ctx: any) => Promise<NextResponse>
) {
  return async (req: any, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (error: any) {
      console.error('Unhandled API Endpoint Error:', error);

      if (error instanceof AppError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            details: error.details,
          },
          { status: error.statusCode }
        );
      }

      // Default unhandled error response
      return NextResponse.json(
        {
          success: false,
          error: 'An unexpected error occurred',
          details: [error.message || 'Internal Server Error'],
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Formats success API payloads matching the { success: true, data: {}, message: "" } rules.
 */
export function sendSuccess(data: any, message = 'Success', status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}
