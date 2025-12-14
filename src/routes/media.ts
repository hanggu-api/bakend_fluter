import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import multer from 'multer';
let sharp: any = null;
try { sharp = require('sharp'); } catch { sharp = null; }
import { UserRepository } from '../repositories/userRepository';
import { ServiceRepository } from '../repositories/serviceRepository';
import { redis } from '../platform';
import { Client as MinioClient } from 'minio';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const userRepo = new UserRepository();
const serviceRepo = new ServiceRepository();

const endpoint = process.env.R2_ENDPOINT || '';
const url = (() => { try { return new URL(endpoint); } catch { return null; } })();
const r2 = new MinioClient({
  endPoint: url ? url.hostname : endpoint.replace(/^https?:\/\//, ''),
  port: 443,
  useSSL: true,
  accessKey: process.env.R2_ACCESS_KEY_ID || '',
  secretKey: process.env.R2_SECRET_ACCESS_KEY || '',
});
const R2_BUCKET = process.env.R2_BUCKET || '';

router.post('/avatar', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  try {
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }
    if (!sharp) {
      res.status(501).json({ success: false, message: 'Image processing unavailable' });
      return;
    }
    const thumbWebp = await sharp(req.file.buffer).resize(128, 128, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    await userRepo.updateAvatarBlob(user.id!, thumbWebp);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

router.get('/avatar/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id!;
    const blob = await userRepo.getAvatarBlob(userId);
    if (!blob) {
      res.status(204).end();
      return;
    }
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).send(blob);
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch avatar' });
  }
});

// Upload chat image -> Cloudflare R2 (webp)
router.post('/chat/image', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const serviceId = (req.body.serviceId || req.query.serviceId) as string | undefined;
    if (!req.file || !serviceId) {
      res.status(400).json({ success: false, message: 'Missing file or serviceId' });
      return;
    }
    if (!sharp) {
      res.status(501).json({ success: false, message: 'Image processing unavailable' });
      return;
    }
    const key = `chat/${serviceId}/${uuidv4()}.webp`;
    const webp = await sharp(req.file.buffer).resize(1920, 1920, { fit: 'inside' }).webp({ quality: 82 }).toBuffer();
    await r2.putObject(R2_BUCKET, key, webp, webp.length, { 'Content-Type': 'image/webp' });
    res.status(201).json({ success: true, key });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Upload chat audio (mp3) -> Cloudflare R2
router.post('/chat/audio', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const serviceId = (req.body.serviceId || req.query.serviceId) as string | undefined;
    if (!req.file || !serviceId) {
      res.status(400).json({ success: false, message: 'Missing file or serviceId' });
      return;
    }
    const allowed = new Set(['audio/mpeg', 'audio/webm', 'audio/wav', 'audio/aac', 'audio/mp4', 'audio/x-m4a']);
    const mime = (req.file.mimetype || '').toLowerCase();
    if (!allowed.has(mime)) {
      res.status(415).json({ success: false, message: `Unsupported audio type: ${mime}` });
      return;
    }
    const ext = mime === 'audio/mpeg' ? 'mp3'
      : mime === 'audio/webm' ? 'webm'
      : mime === 'audio/wav' ? 'wav'
      : (mime === 'audio/mp4' || mime === 'audio/x-m4a') ? 'm4a'
      : mime === 'audio/aac' ? 'aac'
      : 'bin';
    const key = `chat/${serviceId}/${uuidv4()}.${ext}`;
    await r2.putObject(R2_BUCKET, key, req.file.buffer, req.file.size, { 'Content-Type': mime });
    res.status(201).json({ success: true, key });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Get signed view URL for a media key
router.get('/view', authMiddleware, async (req: Request, res: Response) => {
  try {
    const key = (req.query.key as string) || '';
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to sign URL' });
  }
});

router.get('/content', authMiddleware, async (req: Request, res: Response) => {
  try {
    const key = (req.query.key as string) || '';
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
    const user = (req as AuthRequest).user;
    if (!svc || !user || (user.id !== svc.client_id && user.id !== (svc.provider_id || 0))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    const mime = key.endsWith('.webp') ? 'image/webp' : key.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    let signed = await redis.get(`media:url:${key}`);
    if (!signed) {
      signed = await r2.presignedGetObject(R2_BUCKET, key, 60);
      await redis.set(`media:url:${key}`, signed, 'EX', 50);
    }
    const resp = await axios.get(signed, { responseType: 'stream' });
    await new Promise<void>((resolve, reject) => {
      resp.data.on('error', reject);
      resp.data.on('end', () => resolve());
      resp.data.pipe(res);
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch media' });
  }
});

export default router;