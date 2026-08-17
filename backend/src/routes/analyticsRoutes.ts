import { Router } from 'express';
import { getKPIMetrics } from '../controllers/analyticsController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Restricted to users with 'dashboard:view' permission (or Supervisor)
router.get('/kpi', requirePermission('dashboard:view'), getKPIMetrics);

export default router;
