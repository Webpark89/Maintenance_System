import { Router } from 'express';
import { getKPIMetrics } from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { roleGuard } from '../middlewares/roleGuard.js';

const router = Router();

router.use(authenticate);

// Restricted strictly to Supervisor role for KPI Analytics
router.get('/kpi', roleGuard(['supervisor']), getKPIMetrics);

export default router;
