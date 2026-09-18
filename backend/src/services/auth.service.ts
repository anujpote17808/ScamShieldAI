import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { getJwtSecret } from '../config';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

export class AuthService {
  static async register(email: string, passwordHash: string, name: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw { statusCode: 409, code: 'USER_EXISTS', message: 'An account with this email already exists' };
    }

    let user;
    try {
      user = await prisma.user.create({
        data: { email, passwordHash, name, settings: { create: {} } }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw { statusCode: 409, code: 'USER_EXISTS', message: 'An account with this email already exists' };
      }
      throw error;
    }

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async login(email: string, passwordString: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(passwordString, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
    }

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });
    
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
