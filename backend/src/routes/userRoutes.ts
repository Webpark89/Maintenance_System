import { Router } from 'express';
import {
  getUsers,
  getDepartments,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
} from '../controllers/userController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Read endpoints require 'user:read' permission (or supervisor)
router.get('/', requirePermission('user:read'), getUsers);
router.get('/departments', requirePermission('user:read'), getDepartments);

// Modification endpoints require 'user:manage' permission (or supervisor)
router.post('/', requirePermission('user:manage'), createUser);
router.put('/:id', requirePermission('user:manage'), updateUser);
router.patch('/:id/status', requirePermission('user:manage'), toggleUserStatus);
router.post('/:id/reset-password', requirePermission('user:manage'), resetPassword);

export default router;
