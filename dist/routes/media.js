"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const userRepository_1 = require("../repositories/userRepository");
const serviceRepository_1 = require("../repositories/serviceRepository");
const minio_1 = require("minio");
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const userRepo = new userRepository_1.UserRepository();
const serviceRepo = new serviceRepository_1.ServiceRepository();
const endpoint = process.env.R2_ENDPOINT || '';
const url = (() => { try {
    return new URL(endpoint);
}
catch {
    return null;
} })();
const r2 = new minio_1.Client({
    endPoint: url ? url.hostname : endpoint.replace(/^https?:\/\//, ''),
    port: 443,
    useSSL: true,
    accessKey: process.env.R2_ACCESS_KEY_ID || '',
    secretKey: process.env.R2_SECRET_ACCESS_KEY || '',
});
const R2_BUCKET = process.env.R2_BUCKET || '';
router.post('/avatar', authMiddleware_1.authMiddleware, upload.single('file'), async (req, res) => {
    const user = req.user;
    try {
        if (!user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file provided' });
            return;
        }
        const thumbWebp = await (0, sharp_1.default)(req.file.buffer).resize(128, 128, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
        await userRepo.updateAvatarBlob(user.id, thumbWebp);
        res.status(201).json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});
router.get('/avatar/me', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const blob = await userRepo.getAvatarBlob(userId);
        if (!blob) {
            res.status(204).end();
            return;
        }
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.status(200).send(blob);
    }
    catch {
        res.status(500).json({ success: false, message: 'Failed to fetch avatar' });
    }
});
// Upload chat image -> Cloudflare R2 (webp)
router.post('/chat/image', authMiddleware_1.authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const serviceId = (req.body.serviceId || req.query.serviceId);
        if (!req.file || !serviceId) {
            res.status(400).json({ success: false, message: 'Missing file or serviceId' });
            return;
        }
        const key = `chat/${serviceId}/${(0, uuid_1.v4)()}.webp`;
        const webp = await (0, sharp_1.default)(req.file.buffer).resize(1920, 1920, { fit: 'inside' }).webp({ quality: 82 }).toBuffer();
        await r2.putObject(R2_BUCKET, key, webp, webp.length, { 'Content-Type': 'image/webp' });
        res.status(201).json({ success: true, key });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});
// Upload chat audio (mp3) -> Cloudflare R2
router.post('/chat/audio', authMiddleware_1.authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const serviceId = (req.body.serviceId || req.query.serviceId);
        if (!req.file || !serviceId) {
            res.status(400).json({ success: false, message: 'Missing file or serviceId' });
            return;
        }
        if (req.file.mimetype !== 'audio/mpeg') {
            res.status(415).json({ success: false, message: 'Only MP3 (audio/mpeg) is supported' });
            return;
        }
        const key = `chat/${serviceId}/${(0, uuid_1.v4)()}.mp3`;
        await r2.putObject(R2_BUCKET, key, req.file.buffer, req.file.size, { 'Content-Type': 'audio/mpeg' });
        res.status(201).json({ success: true, key });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});
// Get signed view URL for a media key
router.get('/view', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const key = req.query.key || '';
        if (!key) {
            res.status(400).json({ success: false, message: 'Missing key' });
            return;
        }
        const publicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
        if (publicBase) {
            const signed = await r2.presignedGetObject(R2_BUCKET, key, 60 * 30);
            res.json({ success: true, url: signed });
            return;
        }
        const signed = await r2.presignedGetObject(R2_BUCKET, key, 60 * 30);
        res.json({ success: true, url: signed });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to sign URL' });
    }
});
router.get('/content', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const key = req.query.key || '';
        if (!key) {
            res.status(400).json({ success: false, message: 'Missing key' });
            return;
        }
        if (!key.startsWith('chat/')) {
            res.status(400).json({ success: false, message: 'Invalid key' });
            return;
        }
        const parts = key.split('/');
        const serviceId = parts[1];
        const svc = await serviceRepo.findById(serviceId);
        const user = req.user;
        if (!svc || !user || (user.id !== svc.client_id && user.id !== (svc.provider_id || 0))) {
            res.status(403).json({ success: false, message: 'Forbidden' });
            return;
        }
        const mime = key.endsWith('.webp') ? 'image/webp' : key.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        const signed = await r2.presignedGetObject(R2_BUCKET, key, 60);
        const resp = await axios_1.default.get(signed, { responseType: 'stream' });
        await new Promise((resolve, reject) => {
            resp.data.on('error', reject);
            resp.data.on('end', () => resolve());
            resp.data.pipe(res);
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch media' });
    }
});
exports.default = router;
