import { Router } from 'express';
import {
  getAllRequests,
  createRequest,
  updateRequestStatus,
  assignTechnician,
  deleteRequest,
  addRequisitionItem,
  approveRequisition,
  togglePartsReady,
  removeRequisitionItem,
} from '../controllers/requestController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('work_order:read'), getAllRequests);
router.post('/', requirePermission('work_order:create'), createRequest);
router.delete('/:id', requirePermission(['work_order:assign', 'work_order:assess']), deleteRequest);
router.patch('/:id/status', requirePermission(['work_order:assess', 'work_order:assign']), updateRequestStatus);
router.patch('/:id/assign', requirePermission('work_order:assign'), assignTechnician);

// Requisitions endpoints
router.post('/:id/requisitions', requirePermission(['requisition:request', 'work_order:assess']), addRequisitionItem);
router.delete('/:id/requisitions/:reqId', requirePermission(['requisition:request', 'work_order:assess']), removeRequisitionItem);
router.post('/:id/requisitions/approve', requirePermission('requisition:approve'), approveRequisition);
router.patch('/:id/parts-ready', requirePermission('work_order:assess'), togglePartsReady);

export default router;

