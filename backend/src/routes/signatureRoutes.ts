import { Router } from 'express';
import { saveDualSignature } from '../controllers/signatureController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { roleGuard } from '../middlewares/roleGuard.js';

const router = Router();

router.use(authenticate);

// Restricted strictly to Supervisor role on Server-Side Guard
router.post('/:id', roleGuard(['supervisor']), saveDualSignature);

export default router;
