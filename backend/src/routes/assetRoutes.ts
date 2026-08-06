import { Router } from 'express';
import { getAllAssets, getAssetByCode, createAsset } from '../controllers/assetController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { roleGuard } from '../middlewares/roleGuard.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllAssets);
router.get('/:code', getAssetByCode);
router.post('/', roleGuard(['technician', 'supervisor']), createAsset);

export default router;
