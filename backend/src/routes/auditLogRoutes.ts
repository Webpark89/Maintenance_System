import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('audit_log:read'));

router.get('/', getAuditLogs);

export default router;
