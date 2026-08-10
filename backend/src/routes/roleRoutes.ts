import { Router } from 'express';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roleController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

// Protect all Role routes - Require Authentication & 'role:manage' permission guard
router.use(authenticate);
router.use(requirePermission('role:manage'));

router.get('/', getRoles);
router.post('/', createRole);
router.patch('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
