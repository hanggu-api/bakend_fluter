"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const userRepository_1 = require("../repositories/userRepository");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const userRepo = new userRepository_1.UserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// Schema Validation
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(3),
    role: zod_1.z.enum(['client', 'provider']),
    phone: zod_1.z.string().optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
// LOGIN Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await userRepo.findByEmail(email);
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const validPassword = await argon2_1.default.verify(user.password_hash, password);
        if (!validPassword) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        // Generate Token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.role,
            },
            token
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: error.errors });
        }
        else {
            logger_1.default.error('auth.login', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});
// REGISTER Route
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role, phone } = registerSchema.parse(req.body);
        const existingUser = await userRepo.findByEmail(email);
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }
        const hashedPassword = await argon2_1.default.hash(password);
        const userId = await userRepo.create({
            email,
            password_hash: hashedPassword,
            full_name: name,
            role,
            phone
        });
        if (role === 'provider') {
            await userRepo.createProvider(userId);
        }
        // Auto-login
        const token = jsonwebtoken_1.default.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            user: { id: userId, name, email, role },
            token
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: error.errors });
        }
        else {
            logger_1.default.error('auth.register', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});
exports.default = router;
