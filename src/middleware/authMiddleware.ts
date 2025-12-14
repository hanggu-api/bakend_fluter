import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: 'client' | 'provider' | 'admin';
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const userRepo = new UserRepository();

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ success: false, message: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded?.id) {
            res.status(401).json({ success: false, message: 'Invalid token payload' });
            return;
        }
        const exists = await userRepo.findById(Number(decoded.id));
        if (!exists) {
            res.status(401).json({ success: false, message: 'User not found. Please login again.' });
            return;
        }
        req.user = { id: exists.id!, email: exists.email, role: exists.role } as any;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
        return;
    }
};
