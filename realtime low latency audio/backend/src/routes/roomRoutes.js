import express from 'express';
import { createRoom, getRoomDetails, joinRoom, getCallHistory, getRoomTranscript } from '../controllers/roomController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authMiddleware, createRoom);
router.post('/join', authMiddleware, joinRoom);
router.get('/history', authMiddleware, getCallHistory);
router.get('/:roomCode', authMiddleware, getRoomDetails);
router.get('/:roomId/transcript', authMiddleware, getRoomTranscript);

export default router;
