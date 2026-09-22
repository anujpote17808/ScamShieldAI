import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { randomInt } from 'crypto';
import { Prisma, User } from '@prisma/client';
import prisma from '../utils/prisma';
import { getJwtSecret } from '../config';
import { sendPasswordResetOtp, sendTwoFactorOtp } from './email.service';

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

export class AuthService {
  static async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const session = await prisma.authSession.create({
      data: {
        userId,
        tokenHash: '', 
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    const token = jwt.sign(
      { userId, sessionId: session.id },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN }
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.authSession.update({
      where: { id: session.id },
      data: { tokenHash }
    });

    return token;
  }

  static async register(email: string, passwordHash: string, name: string, userAgent?: string, ipAddress?: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw {
        statusCode: 409,
        code: 'USER_EXISTS',
        message: 'An account with this email already exists',
      };
    }

    let user;

    try {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          settings: {
            create: {},
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw {
          statusCode: 409,
          code: 'USER_EXISTS',
          message: 'An account with this email already exists',
        };
      }

      throw error;
    }

    const token = await this.createSession(user.id, userAgent, ipAddress);
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  static async login(email: string, passwordString: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      };
    }

    const isMatch = await bcrypt.compare(
      passwordString,
      user.passwordHash,
    );

    if (!isMatch) {
      throw {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      };
    }

    if (user.twoFactorEnabled) {
      const otp = randomInt(100000, 1000000).toString();
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const challenge = await prisma.twoFactorChallenge.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt
        }
      });

      // We need to send the email. Assuming there's a generic method or we reuse sendPasswordResetOtp,
      // but sendPasswordResetOtp is specific. We'll reuse it for now or we can create a generic one.
      // Reusing sendPasswordResetOtp works, it just says "password reset code". It's better to use it than nothing.
      await sendTwoFactorOtp(user.email, otp);

      const challengeToken = jwt.sign(
        { purpose: '2fa-login', challengeId: challenge.id, userId: user.id },
        getJwtSecret(),
        { expiresIn: '10m' }
      );

      return {
        requiresTwoFactor: true,
        challengeToken
      };
    }

    const token = await this.createSession(user.id, userAgent, ipAddress);
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
      },
    });

    if (!user) {
      throw {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      };
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}
