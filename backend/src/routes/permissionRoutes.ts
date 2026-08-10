import { Router } from 'express';
import { getPermissions } from '../controllers/permissionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// Protect permissions route - Require Authentication
router.use(authenticate);

router.get('/', getPermissions);

export default router;
