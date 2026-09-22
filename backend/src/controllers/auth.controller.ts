import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import prisma from '../utils/prisma';
import { AuthService } from '../services/auth.service';
import { sendPasswordResetOtp, sendTwoFactorOtp } from '../services/email.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getCookieOptions,
  getJwtSecret,
  JWT_COOKIE_NAME,
} from '../config';
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

const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
}).strict();

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8).max(128),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
}).strict();

const verifyLogin2faSchema = z.object({
  challengeToken: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
}).strict();

const verifyEnable2faSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
}).strict();

const disable2faSchema = z.object({
  password: z.string().min(1),
}).strict();

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

function genericResetResponse(res: Response) {
  return res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a verification code has been sent.',
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(password, 10);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, token } = await AuthService.register(
        email,
        passwordHash,
        name,
        userAgent,
        ipAddress
      );

      res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
      logSecurityEvent('registration', { userId: user.id });

      res.status(201).json({ success: true, data: { user, token } });
    } catch (error: any) {
      logSecurityEvent('auth_failure', { action: 'register', reason: error?.code || 'rejected' });
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await AuthService.login(email, password, userAgent, ipAddress);

      if ('requiresTwoFactor' in result) {
        logSecurityEvent('2fa_challenge_issued');
        res.status(200).json({ success: true, data: result });
        return;
      }

      const { user, token } = result as any;
      res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
      logSecurityEvent('auth_success', { userId: user.id });

      res.status(200).json({ success: true, data: { user, token } });
    } catch (error: any) {
      logSecurityEvent('auth_failure', { action: 'login', reason: error?.code || 'rejected' });
      next(error);
    }
  }

  static async verifyLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { challengeToken, otp } = verifyLogin2faSchema.parse(req.body);
      let decoded: any;
      try {
        decoded = jwt.verify(challengeToken, getJwtSecret());
      } catch {
        res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Challenge token is invalid or expired' } });
        return;
      }

      if (decoded.purpose !== '2fa-login' || !decoded.challengeId || !decoded.userId) {
        res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid challenge token' } });
        return;
      }

      const challenge = await prisma.twoFactorChallenge.findUnique({ where: { id: decoded.challengeId } });
      if (!challenge || challenge.usedAt || challenge.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ success: false, error: { code: 'EXPIRED_OTP', message: 'OTP is expired or already used' } });
        return;
      }

      if (challenge.attempts >= 5) {
        res.status(429).json({ success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many failed attempts' } });
        return;
      }

      if (challenge.otpHash !== hashValue(otp)) {
        await prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        res.status(401).json({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid OTP' } });
        return;
      }

      await prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const token = await AuthService.createSession(decoded.userId, userAgent, ipAddress);
      const user = await AuthService.getUserById(decoded.userId);

      res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
      logSecurityEvent('auth_success_2fa', { userId: user.id });

      res.status(200).json({ success: true, data: { user, token } });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { maxAge: _maxAge, ...cookieOptions } = getCookieOptions();
      res.clearCookie(JWT_COOKIE_NAME, cookieOptions);

      const sessionId = req.sessionId;
      if (sessionId) {
        await prisma.authSession.update({
          where: { id: sessionId },
          data: { revokedAt: new Date() }
        }).catch(() => {});
      }

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
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) return genericResetResponse(res);

      const otp = generateOtp();
      const otpHash = hashValue(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.passwordReset.updateMany({
        where: { userId: user.id, resetUsedAt: null },
        data: { resetUsedAt: new Date() },
      });

      await prisma.passwordReset.create({
        data: { userId: user.id, email: user.email, otpHash, expiresAt },
      });

      try {
        await sendPasswordResetOtp(user.email, otp);
      } catch (emailError) {
        await prisma.passwordReset.deleteMany({
          where: { userId: user.id, otpHash, resetUsedAt: null },
        });
        console.error('[password-reset] Email delivery failed:', emailError);
        throw { statusCode: 503, code: 'EMAIL_DELIVERY_FAILED', message: 'We could not send the verification email. Please try again later.' };
      }

      logSecurityEvent('password_reset_requested', { userId: user.id });
      return genericResetResponse(res);
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);

      const resetRequest = await prisma.passwordReset.findFirst({
        where: { email, resetUsedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (!resetRequest) {
        res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'The verification code is invalid or expired.' } });
        return;
      }

      if (resetRequest.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'The verification code has expired. Please request a new one.' } });
        return;
      }

      if (resetRequest.attempts >= 5) {
        res.status(429).json({ success: false, error: { code: 'OTP_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please request a new code.' } });
        return;
      }

      if (hashValue(otp) !== resetRequest.otpHash) {
        await prisma.passwordReset.update({
          where: { id: resetRequest.id },
          data: { attempts: { increment: 1 } },
        });
        res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'The verification code is invalid.' } });
        return;
      }

      const resetToken = jwt.sign(
        { purpose: 'password-reset', userId: resetRequest.userId, resetId: resetRequest.id },
        getJwtSecret(),
        { expiresIn: '10m' }
      );

      await prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: { verifiedAt: new Date(), resetTokenHash: hashValue(resetToken) },
      });

      res.status(200).json({ success: true, data: { resetToken } });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { resetToken, newPassword } = resetPasswordSchema.parse(req.body);
      let decoded: { purpose: string; userId: string; resetId: string };

      try {
        decoded = jwt.verify(resetToken, getJwtSecret()) as typeof decoded;
      } catch {
        res.status(400).json({ success: false, error: { code: 'INVALID_RESET_TOKEN', message: 'The password reset session is invalid or expired.' } });
        return;
      }

      if (decoded.purpose !== 'password-reset' || !decoded.userId || !decoded.resetId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_RESET_TOKEN', message: 'The password reset session is invalid.' } });
        return;
      }

      const resetRequest = await prisma.passwordReset.findUnique({ where: { id: decoded.resetId } });

      if (!resetRequest || resetRequest.userId !== decoded.userId || !resetRequest.verifiedAt || resetRequest.resetUsedAt || !resetRequest.resetTokenHash || resetRequest.resetTokenHash !== hashValue(resetToken) || resetRequest.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ success: false, error: { code: 'INVALID_RESET_TOKEN', message: 'The password reset session is invalid or expired.' } });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      });

      await prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: { resetUsedAt: new Date() },
      });

      await prisma.authSession.updateMany({
        where: { userId: decoded.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      logSecurityEvent('password_reset_completed', { userId: decoded.userId });
      res.status(200).json({ success: true, message: 'Your password has been reset successfully.' });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = req.userId!;
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
        return;
      }

      if (currentPassword === newPassword) {
        res.status(400).json({ success: false, error: { code: 'SAME_PASSWORD', message: 'New password cannot be the same as the current password' } });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: new Date() }
      });

      await prisma.authSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() }
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const token = await AuthService.createSession(userId, userAgent, ipAddress);
      const updatedUser = await AuthService.getUserById(userId);

      res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());
      res.status(200).json({ success: true, data: { user: updatedUser, token } });
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const sessions = await prisma.authSession.findMany({
        where: { userId, revokedAt: null },
        orderBy: { lastUsedAt: 'desc' }
      });

      const safeSessions = sessions.map(s => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
        current: s.id === req.sessionId
      }));

      res.status(200).json({ success: true, data: { sessions: safeSessions } });
    } catch (error) {
      next(error);
    }
  }

  static async revokeSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const sessionIdToRevoke = req.params.sessionId as string;

      const session = await prisma.authSession.findUnique({ where: { id: sessionIdToRevoke } });
      if (!session || session.userId !== userId) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
        return;
      }

      await prisma.authSession.update({
        where: { id: sessionIdToRevoke },
        data: { revokedAt: new Date() }
      });

      res.status(200).json({ success: true, message: 'Session revoked successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async revokeAllSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const currentSessionId = req.sessionId;

      await prisma.authSession.updateMany({
        where: {
          userId,
          id: { not: currentSessionId },
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });

      res.status(200).json({ success: true, message: 'All other sessions revoked successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async requestEnable2fa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        return;
      }

      const otp = generateOtp();
      const otpHash = hashValue(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.twoFactorChallenge.create({
        data: { userId, otpHash, expiresAt }
      });

      await sendTwoFactorOtp(user.email, otp);

      res.status(200).json({ success: true, message: 'OTP sent to your email.' });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEnable2fa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const { otp } = verifyEnable2faSchema.parse(req.body);

      const challenge = await prisma.twoFactorChallenge.findFirst({
        where: { userId, usedAt: null },
        orderBy: { createdAt: 'desc' }
      });

      if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'OTP is invalid or expired' } });
        return;
      }

      if (challenge.attempts >= 5) {
        res.status(429).json({ success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts' } });
        return;
      }

      if (challenge.otpHash !== hashValue(otp)) {
        await prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid OTP' } });
        return;
      }

      await prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });

      res.status(200).json({ success: true, data: { enabled: true } });
    } catch (error) {
      next(error);
    }
  }

  static async disable2fa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const { password } = disable2faSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Incorrect password' } });
        return;
      }

      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });

      res.status(200).json({ success: true, message: 'Two-factor authentication disabled' });
    } catch (error) {
      next(error);
    }
  }
}