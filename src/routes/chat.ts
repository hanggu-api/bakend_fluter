import { Router, Request, Response } from 'express';
import { ChatRepository } from '../repositories/chatRepository';
import logger from '../utils/logger';
import { io } from '../platform';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const chatRepo = new ChatRepository();

// Get Messages for a Service
router.get('/:serviceId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const messages = await chatRepo.getMessages(req.params.serviceId);
        res.json({ success: true, messages });
    } catch (error) {
        logger.error('chat.get', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Send Message
router.post('/:serviceId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { content, type } = req.body;
        const user = (req as AuthRequest).user;

        const messageId = await chatRepo.sendMessage({
            service_id: req.params.serviceId,
            sender_id: user!.id!,
            content,
            type
        });
        io.to(`service:${req.params.serviceId}`).emit('chat.message', {
            id: messageId,
            service_id: req.params.serviceId,
            sender_id: user!.id!,
            content,
            type,
            created_at: new Date().toISOString(),
        });
        logger.service('chat.message', { id: messageId, service_id: req.params.serviceId, sender_id: user!.id });
        res.status(201).json({ success: true, id: messageId });
    } catch (error) {
        logger.error('chat.post', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
