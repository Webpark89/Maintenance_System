import { Router } from 'express';
import { getPMSchedules, createPMSchedule, generatePMWorkOrder } from '../controllers/pmController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('pm:read'), getPMSchedules);
router.post('/', requirePermission('pm:manage'), createPMSchedule);
router.post('/:id/generate-wo', requirePermission('pm:manage'), generatePMWorkOrder);

export default router;
