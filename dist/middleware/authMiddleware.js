"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userRepository_1 = require("../repositories/userRepository");
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const userRepo = new userRepository_1.UserRepository();
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ success: false, message: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded?.id) {
            res.status(401).json({ success: false, message: 'Invalid token payload' });
            return;
        }
        const exists = await userRepo.findById(Number(decoded.id));
        if (!exists) {
            res.status(401).json({ success: false, message: 'User not found. Please login again.' });
            return;
        }
        req.user = { id: exists.id, email: exists.email, role: exists.role };
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
