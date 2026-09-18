import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Server logs retain diagnostic context; client responses never expose stacks,
  // provider headers, or environment values.
  console.error('[API error]', err?.code || err?.name || 'SERVER_ERROR');

  const requestedStatus = err instanceof z.ZodError ? 400 : err?.statusCode || err?.status;
  const statusCode = typeof requestedStatus === 'number' && requestedStatus >= 400 && requestedStatus < 500 ? requestedStatus : 500;
  const code = err instanceof z.ZodError ? 'VALIDATION_ERROR' : statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : statusCode === 400 ? 'INVALID_REQUEST' : err?.code || 'SERVER_ERROR';
  const message = err instanceof z.ZodError ? 'Invalid request data'
    : statusCode === 413 ? 'Request body is too large'
      : statusCode === 400 ? 'Invalid request'
        : statusCode < 500 && typeof err?.message === 'string' ? err.message
          : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};
