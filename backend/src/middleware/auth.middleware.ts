import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_COOKIE_NAME } from '../config';

// AuthRequest is now just an alias for Request because userId is added
// to the global Express.Request namespace via src/types/express.d.ts.
// All existing imports of AuthRequest continue to work without changes.
export type AuthRequest = Request;

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  const token = bearerToken || req.cookies?.[JWT_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return;
  }
};
