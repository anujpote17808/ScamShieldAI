import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loginRateLimit, passwordResetRateLimit, registrationRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/register', registrationRateLimit, AuthController.register);
router.post('/login', loginRateLimit, AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', passwordResetRateLimit, AuthController.forgotPassword);
router.get('/me', authenticate, AuthController.me);

export default router;
