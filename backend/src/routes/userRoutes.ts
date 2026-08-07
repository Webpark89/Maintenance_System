import { Router } from 'express';
import {
  getUsers,
  getDepartments,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Protect all user management routes - Require Supervisor authentication
router.use(authenticate);
router.use(authorize(['supervisor']));

router.get('/', getUsers);
router.get('/departments', getDepartments);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/reset-password', resetPassword);

export default router;
