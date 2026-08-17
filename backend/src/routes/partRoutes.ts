import { Router } from 'express';
import { getParts, createPart, updatePart, adjustStock } from '../controllers/partController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Read parts require 'inventory:read'
router.get('/', requirePermission('inventory:read'), getParts);

// Manage parts require 'inventory:manage'
router.post('/', requirePermission('inventory:manage'), createPart);
router.put('/:id', requirePermission('inventory:manage'), updatePart);
router.post('/:id/adjust', requirePermission('inventory:manage'), adjustStock);

export default router;
