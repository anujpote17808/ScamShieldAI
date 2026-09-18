import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getCookieOptions, JWT_COOKIE_NAME } from '../config';
import { logSecurityEvent } from '../utils/security-logger';

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(100),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict();

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(password, 10);
      const { user, token } = await AuthService.register(email, passwordHash, name);

      // Set httpOnly cookie for same-domain / local development.
      res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
      logSecurityEvent('registration', { userId: user.id });

      // Also include the token in the response body so cross-domain clients
      // (e.g. Vercel frontend → Render backend) can store it in localStorage
      // and send it as Authorization: Bearer — bypassing all cross-site cookie issues.
      res.status(201).json({ success: true, data: { user, token } });
    } catch (error: any) {
      logSecurityEvent('auth_failure', { action: 'register', reason: error?.code || 'rejected' });
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(email, password);

      // Set httpOnly cookie for same-domain / local development.
      res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
      logSecurityEvent('auth_success', { userId: user.id });

      // Include token in body for cross-domain Bearer token auth.
      res.status(200).json({ success: true, data: { user, token } });
    } catch (error: any) {
      logSecurityEvent('auth_failure', { action: 'login', reason: error?.code || 'rejected' });
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { maxAge: _maxAge, ...cookieOptions } = getCookieOptions();
      res.clearCookie(JWT_COOKIE_NAME, cookieOptions);
      logSecurityEvent('logout');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const user = await AuthService.getUserById(userId);
      res.status(200).json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      forgotPasswordSchema.parse(req.body);
      // Password reset delivery is not implemented; retain a uniform response.
      res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
}
