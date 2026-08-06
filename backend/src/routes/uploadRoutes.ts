import { Router } from 'express';
import { handleImageUpload } from '../controllers/uploadController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadImageMiddleware } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/image', uploadImageMiddleware.single('image'), handleImageUpload);

export default router;
