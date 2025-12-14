"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const serviceRepository_1 = require("../repositories/serviceRepository");
const logger_1 = __importDefault(require("../utils/logger"));
const server_1 = require("../server");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const serviceRepo = new serviceRepository_1.ServiceRepository();
// Validation Schemas
const createServiceSchema = zod_1.z.object({
    category_id: zod_1.z.number(),
    description: zod_1.z.string().min(10),
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
    address: zod_1.z.string(),
    price_estimated: zod_1.z.number(),
    price_upfront: zod_1.z.number()
});
// Create Service (Client)
router.post('/', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'client') {
            res.status(403).json({ success: false, message: 'Only clients can create services' });
            return;
        }
        const data = createServiceSchema.parse(req.body);
        const id = await serviceRepo.create({
            ...data,
            client_id: user.id
        });
        logger_1.default.service('service.created', { id, client_id: user.id, category_id: data.category_id, price_estimated: data.price_estimated, price_upfront: data.price_upfront });
        server_1.io.emit('service.created', { id, ...data, client_id: user.id });
        res.status(201).json({ success: true, id, message: 'Service created successfully' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: error.errors });
        }
        else {
            logger_1.default.error('services.create', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});
// List My Services (Client or Provider)
router.get('/my', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        let services = [];
        if (user?.role === 'provider') {
            services = await serviceRepo.findByProvider(user.id);
        }
        else {
            services = await serviceRepo.findByClient(user.id);
        }
        res.json({ success: true, services });
    }
    catch (error) {
        logger_1.default.error('services.my', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// List Available Services (Provider Dashboard)
router.get('/available', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'provider') {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }
        const services = await serviceRepo.findPendingForProvider();
        res.json({ success: true, services });
    }
    catch (error) {
        logger_1.default.error('services.available', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Get Service Details
router.get('/:id', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const service = await serviceRepo.findById(req.params.id);
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        res.json({ success: true, service });
    }
    catch (error) {
        logger_1.default.error('services.details', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Provider Accept Service
router.post('/:id/accept', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'provider') {
            res.status(403).json({ success: false, message: 'Only providers can accept services' });
            return;
        }
        const success = await serviceRepo.acceptService(req.params.id, user.id);
        if (success) {
            logger_1.default.service('service.accepted', { id: req.params.id, provider_id: user.id });
            server_1.io.to(`service:${req.params.id}`).emit('service.accepted', { id: req.params.id, provider_id: user.id });
            server_1.io.emit('service.status', { id: req.params.id, status: 'accepted' });
            res.json({ success: true, message: 'Service accepted!' });
        }
        else {
            res.status(409).json({ success: false, message: 'Service already taken or unavailable' });
        }
    }
    catch (error) {
        logger_1.default.error('services.accept', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
