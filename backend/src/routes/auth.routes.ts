import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  loginRateLimit,
  passwordResetRateLimit,
  registrationRateLimit,
} from '../middleware/rate-limit.middleware';

const router = Router();

router.post(
  '/register',
  registrationRateLimit,
  AuthController.register,
);

router.post(
  '/login',
  loginRateLimit,
  AuthController.login,
);

router.post(
  '/logout',
  AuthController.logout,
);

router.post(
  '/forgot-password',
  passwordResetRateLimit,
  AuthController.forgotPassword,
);

router.post(
  '/verify-otp',
  passwordResetRateLimit,
  AuthController.verifyOtp,
);

router.post(
  '/reset-password',
  passwordResetRateLimit,
  AuthController.resetPassword,
);

router.get(
  '/me',
  authenticate,
  AuthController.me,
);

router.post(
  '/change-password',
  authenticate,
  passwordResetRateLimit, // reusing for rate limit
  AuthController.changePassword,
);

router.get(
  '/sessions',
  authenticate,
  AuthController.getSessions,
);

router.delete(
  '/sessions/:sessionId',
  authenticate,
  AuthController.revokeSession,
);

router.post(
  '/sessions/revoke-all',
  authenticate,
  AuthController.revokeAllSessions,
);

router.post(
  '/2fa/request-enable',
  authenticate,
  AuthController.requestEnable2fa,
);

router.post(
  '/2fa/verify-enable',
  authenticate,
  AuthController.verifyEnable2fa,
);

router.post(
  '/2fa/disable',
  authenticate,
  AuthController.disable2fa,
);

router.post(
  '/2fa/verify-login',
  loginRateLimit,
  AuthController.verifyLogin,
);

export default router;