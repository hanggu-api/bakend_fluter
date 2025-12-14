import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserRepository } from '../repositories/userRepository';
import logger from '../utils/logger';

const router = Router();
const userRepo = new UserRepository();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Schema Validation
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(3),
    role: z.enum(['client', 'provider']),
    phone: z.string().optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

// LOGIN Route
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await userRepo.findByEmail(email);
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        const validPassword = await argon2.verify(user.password_hash, password);
        if (!validPassword) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

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

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: (error as any).errors });
        } else {
            logger.error('auth.login', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

// REGISTER Route
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name, role, phone } = registerSchema.parse(req.body);

        const existingUser = await userRepo.findByEmail(email);
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }

        const hashedPassword = await argon2.hash(password);

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
        const token = jwt.sign(
            { id: userId, email, role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            user: { id: userId, name, email, role },
            token
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: (error as any).errors });
        } else {
            logger.error('auth.register', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

export default router;
