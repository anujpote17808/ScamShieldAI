export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_jwt_secret') {
    throw new Error('JWT_SECRET must be configured in the backend environment');
  }
  return secret;
}

export function getClientUrl(): string {
  const configured = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    const origin = new URL(configured).origin;
    if (origin === 'null' || configured === '*') throw new Error('invalid origin');
    return origin;
  } catch {
    throw new Error('FRONTEND_URL must be a valid explicit HTTP(S) origin');
  }
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAgeDays = Number.parseInt(process.env.JWT_COOKIE_MAX_AGE_DAYS || '7', 10);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: (Number.isFinite(maxAgeDays) && maxAgeDays > 0 ? maxAgeDays : 7) * 24 * 60 * 60 * 1000,
  };
}

export const JWT_COOKIE_NAME = 'token';
