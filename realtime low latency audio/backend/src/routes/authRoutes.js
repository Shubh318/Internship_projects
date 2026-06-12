import express from 'express';
import { register, login, getMe, updatePreferences } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/language-preferences', authMiddleware, updatePreferences);

export default router;
