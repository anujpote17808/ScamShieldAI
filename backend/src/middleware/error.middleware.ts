import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Log the full error object to Render logs so DB issues, missing env vars,
  // and Prisma errors are visible. Never send stack traces or env values to the client.
  console.error('[API error]', {
    code: err?.code || err?.name || 'SERVER_ERROR',
    message: err?.message,
    statusCode: err?.statusCode || err?.status,
    // Include Prisma error details if present
    meta: err?.meta,
    stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
  });

  const requestedStatus = err instanceof z.ZodError ? 400 : err?.statusCode || err?.status;
  const statusCode =
    typeof requestedStatus === 'number' && requestedStatus >= 400 && requestedStatus < 500
      ? requestedStatus
      : 500;

  const code =
    err instanceof z.ZodError
      ? 'VALIDATION_ERROR'
      : statusCode === 413
      ? 'PAYLOAD_TOO_LARGE'
      : statusCode === 400
      ? 'INVALID_REQUEST'
      : err?.code || 'SERVER_ERROR';

  // Build a clear, safe message for each known case
  let message: string;
  if (err instanceof z.ZodError) {
    // Surface the first validation issue clearly (no internal paths or secrets)
    const firstIssue = err.issues[0];
    message = firstIssue
      ? `${firstIssue.path.join('.') || 'field'}: ${firstIssue.message}`
      : 'Invalid request data';
  } else if (statusCode === 413) {
    message = 'Request body is too large';
  } else if (statusCode === 409) {
    message = err?.message || 'A conflict occurred';
  } else if (statusCode === 401) {
    message = err?.message || 'Unauthorized';
  } else if (statusCode === 403) {
    message = err?.message || 'Forbidden';
  } else if (statusCode === 404) {
    message = err?.message || 'Not found';
  } else if (statusCode < 500 && typeof err?.message === 'string') {
    message = err.message;
  } else {
    // 5xx: never expose internal details to the client
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};
