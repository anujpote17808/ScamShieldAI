import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_COOKIE_NAME } from '../config';
import prisma from '../utils/prisma';

// AuthRequest is now just an alias for Request because userId is added
// to the global Express.Request namespace via src/types/express.d.ts.
// All existing imports of AuthRequest continue to work without changes.
export type AuthRequest = Request;

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  const token = bearerToken || req.cookies?.[JWT_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string, sessionId?: string };
    req.userId = decoded.userId;
    req.sessionId = decoded.sessionId;

    if (decoded.sessionId) {
      const session = await prisma.authSession.findUnique({
        where: { id: decoded.sessionId }
      });

      if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session is invalid or expired' } });
        return;
      }

      // Update lastUsedAt if more than 5 minutes have passed
      if (Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 1000) {
        await prisma.authSession.update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() }
        }).catch(() => {});
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return;
  }
};
