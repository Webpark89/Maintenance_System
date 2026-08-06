import { Router } from 'express';
import {
  getAllRequests,
  createRequest,
  updateRequestStatus,
  assignTechnician,
} from '../controllers/requestController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { roleGuard } from '../middlewares/roleGuard.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllRequests);
router.post('/', createRequest);
router.patch('/:id/status', roleGuard(['technician', 'supervisor']), updateRequestStatus);
router.patch('/:id/assign', roleGuard(['supervisor']), assignTechnician);

export default router;
