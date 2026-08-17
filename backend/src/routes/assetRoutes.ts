import { Router } from 'express';
import { getAllAssets, getAssetByCode, createAsset } from '../controllers/assetController.js';
import { authenticate, requirePermission } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('asset:read'), getAllAssets);
router.get('/:code', requirePermission('asset:read'), getAssetByCode);
router.post('/', requirePermission('asset:create'), createAsset);

export default router;
