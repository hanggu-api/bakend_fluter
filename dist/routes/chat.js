"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatRepository_1 = require("../repositories/chatRepository");
const logger_1 = __importDefault(require("../utils/logger"));
const server_1 = require("../server");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const chatRepo = new chatRepository_1.ChatRepository();
// Get Messages for a Service
router.get('/:serviceId', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const messages = await chatRepo.getMessages(req.params.serviceId);
        res.json({ success: true, messages });
    }
    catch (error) {
        logger_1.default.error('chat.get', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Send Message
router.post('/:serviceId', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { content, type } = req.body;
        const user = req.user;
        const messageId = await chatRepo.sendMessage({
            service_id: req.params.serviceId,
            sender_id: user.id,
            content,
            type
        });
        server_1.io.to(`service:${req.params.serviceId}`).emit('chat.message', {
            id: messageId,
            service_id: req.params.serviceId,
            sender_id: user.id,
            content,
            type,
            created_at: new Date().toISOString(),
        });
        logger_1.default.service('chat.message', { id: messageId, service_id: req.params.serviceId, sender_id: user.id });
        res.status(201).json({ success: true, id: messageId });
    }
    catch (error) {
        logger_1.default.error('chat.post', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
