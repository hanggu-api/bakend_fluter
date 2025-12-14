import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ServiceRepository } from '../repositories/serviceRepository';
import logger from '../utils/logger';
import { io } from '../platform';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const serviceRepo = new ServiceRepository();

// Validation Schemas
const createServiceSchema = z.object({
    category_id: z.number(),
    description: z.string().min(10),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
    price_estimated: z.number(),
    price_upfront: z.number()
});

// Create Service (Client)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user;
        if (user?.role !== 'client') {
            res.status(403).json({ success: false, message: 'Only clients can create services' });
            return;
        }

        const data = createServiceSchema.parse(req.body);
        const id = await serviceRepo.create({
            ...data,
            client_id: user.id!
        });
        logger.service('service.created', { id, client_id: user.id, category_id: data.category_id, price_estimated: data.price_estimated, price_upfront: data.price_upfront });
        io.emit('service.created', { id, ...data, client_id: user.id });
        res.status(201).json({ success: true, id, message: 'Service created successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: (error as any).errors });
        } else {
            logger.error('services.create', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

// List My Services (Client or Provider)
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user;
        let services = [];

        if (user?.role === 'provider') {
            services = await serviceRepo.findByProvider(user.id!);
        } else {
            services = await serviceRepo.findByClient(user!.id!);
        }

        res.json({ success: true, services });
    } catch (error) {
        logger.error('services.my', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// List Available Services (Provider Dashboard)
router.get('/available', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user;
        if (user?.role !== 'provider') {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }
        const services = await serviceRepo.findPendingForProvider();
        res.json({ success: true, services });
    } catch (error) {
        logger.error('services.available', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get Service Details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const service = await serviceRepo.findById(req.params.id);
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        res.json({ success: true, service });
    } catch (error) {
        logger.error('services.details', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Provider Accept Service
router.post('/:id/accept', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user;
        if (user?.role !== 'provider') {
            res.status(403).json({ success: false, message: 'Only providers can accept services' });
            return;
        }

        const success = await serviceRepo.acceptService(req.params.id, user.id!);
        if (success) {
            logger.service('service.accepted', { id: req.params.id, provider_id: user.id });
            io.to(`service:${req.params.id}`).emit('service.accepted', { id: req.params.id, provider_id: user.id });
            io.emit('service.status', { id: req.params.id, status: 'accepted' });
            res.json({ success: true, message: 'Service accepted!' });
        } else {
            res.status(409).json({ success: false, message: 'Service already taken or unavailable' });
        }
    } catch (error) {
        logger.error('services.accept', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
