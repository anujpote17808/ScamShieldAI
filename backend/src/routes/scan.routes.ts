import { Router } from 'express';
import { ScanController } from '../controllers/scan.controller';
import { authenticate } from '../middleware/auth.middleware';
import { scanConcurrencyLimit, scanRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);

router.post('/', scanRateLimit, scanConcurrencyLimit, ScanController.createScan);
router.get('/', ScanController.getScans);
router.get('/:id', ScanController.getScanById);
router.delete('/:id', ScanController.deleteScan);

export default router;
