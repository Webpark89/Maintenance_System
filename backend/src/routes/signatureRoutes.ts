import { Router } from 'express';
import { saveDualSignature } from '../controllers/signatureController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Restricted to users with 'work_order:assess' permission (or Supervisor)
router.post('/:id', requirePermission(['work_order:assess', 'work_order:read']), saveDualSignature);

export default router;
