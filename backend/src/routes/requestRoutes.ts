import { Router } from 'express';
import {
  getAllRequests,
  createRequest,
  updateRequestStatus,
  assignTechnician,
} from '../controllers/requestController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('work_order:read'), getAllRequests);
router.post('/', requirePermission('work_order:create'), createRequest);
router.patch('/:id/status', requirePermission(['work_order:assess', 'work_order:assign']), updateRequestStatus);
router.patch('/:id/assign', requirePermission('work_order:assign'), assignTechnician);

export default router;
