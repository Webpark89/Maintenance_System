import { Router } from 'express';
import { login, getCurrentUser, logout, getTechnicians } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.get('/technicians', authenticate, getTechnicians);
router.post('/logout', authenticate, logout);

export default router;

