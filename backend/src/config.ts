export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_jwt_secret') {
    throw new Error('JWT_SECRET must be configured in the backend environment');
  }
  return secret;
}

export function getClientUrls(): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const configured = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
  
  if (isProduction && !configured) {
    throw new Error('FRONTEND_URL must be configured in production environment');
  }

  const origins: string[] = [];

  // Default development origins
  if (!isProduction) {
    origins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175');
  }

  if (configured) {
    const parts = configured.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      try {
        const origin = new URL(part).origin;
        if (origin !== 'null' && part !== '*') {
          origins.push(origin);
        }
      } catch {
        console.error(`FRONTEND_URL must be a valid explicit HTTP(S) origin, invalid part: "${part}"`);
        if (isProduction) {
          throw new Error(`Invalid FRONTEND_URL in production: ${part}`);
        }
      }
    }
  }

  if (isProduction && origins.length === 0) {
    throw new Error('No valid CORS origins found for production');
  }

  // Deduplicate
  return Array.from(new Set(origins));
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAgeDays = Number.parseInt(process.env.JWT_COOKIE_MAX_AGE_DAYS || '7', 10);
  return {
    httpOnly: true,
    secure: isProduction,
    // In production the frontend and backend are on different domains (Vercel + Render).
    // sameSite must be 'none' so the browser sends the cookie on cross-site requests.
    // sameSite 'none' requires secure:true, which is already set in production above.
    // In development 'lax' is fine because both run on localhost.
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: (Number.isFinite(maxAgeDays) && maxAgeDays > 0 ? maxAgeDays : 7) * 24 * 60 * 60 * 1000,
  };
}

export const JWT_COOKIE_NAME = 'token';
