import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { logSecurityEvent } from '../utils/security-logger';

type RateLimitOptions = { name: string; windowMs: number; max: number; key: (req: Request) => string };
type Entry = { count: number; resetAt: number };

function positiveEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createRateLimiter(options: RateLimitOptions) {
  const entries = new Map<string, Entry>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (entries.size > 10_000) {
      for (const [entryKey, entry] of entries) if (entry.resetAt <= now) entries.delete(entryKey);
    }
    const key = `${options.name}:${options.key(req)}`;
    const existing = entries.get(key);
    const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : existing;
    entry.count += 1;
    entries.set(key, entry);
    if (entry.count > options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      logSecurityEvent('rate_limited', { scope: options.name });
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } });
      return;
    }
    next();
  };
}

export function createConcurrencyLimiter(max: number) {
  let active = 0;
  return (_req: Request, res: Response, next: NextFunction) => {
    if (active >= max) {
      res.status(429).json({ success: false, error: { code: 'SCAN_CAPACITY_REACHED', message: 'Scan capacity is temporarily full. Please try again shortly.' } });
      return;
    }
    active += 1;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        active -= 1;
      }
    };
    res.once('finish', release);
    res.once('close', release);
    next();
  };
}

const ipKey = (req: Request) => req.ip || 'unknown';
const userKey = (req: Request) => (req as AuthRequest).userId || ipKey(req);

export const loginRateLimit = createRateLimiter({ name: 'login', windowMs: positiveEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), max: positiveEnv('LOGIN_RATE_LIMIT_MAX', 10), key: ipKey });
export const registrationRateLimit = createRateLimiter({ name: 'register', windowMs: positiveEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), max: positiveEnv('REGISTER_RATE_LIMIT_MAX', 5), key: ipKey });
export const passwordResetRateLimit = createRateLimiter({ name: 'password-reset', windowMs: positiveEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), max: positiveEnv('PASSWORD_RESET_RATE_LIMIT_MAX', 5), key: ipKey });
export const scanRateLimit = createRateLimiter({ name: 'scan', windowMs: positiveEnv('SCAN_RATE_LIMIT_WINDOW_MS', 60 * 1000), max: positiveEnv('SCAN_RATE_LIMIT_MAX', 20), key: userKey });
export const scanConcurrencyLimit = createConcurrencyLimiter(positiveEnv('SCAN_CONCURRENCY_MAX', 4));
