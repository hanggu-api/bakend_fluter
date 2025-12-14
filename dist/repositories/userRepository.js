"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const db_1 = __importDefault(require("../database/db"));
class UserRepository {
    async findById(id) {
        const [rows] = await db_1.default.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }
    async findByEmail(email) {
        const [rows] = await db_1.default.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length > 0 ? rows[0] : null;
    }
    async create(user) {
        const [result] = await db_1.default.query('INSERT INTO users (email, password_hash, full_name, role, phone) VALUES (?, ?, ?, ?, ?)', [user.email, user.password_hash, user.full_name, user.role, user.phone]);
        return result.insertId;
    }
    async createProvider(userId, bio = '') {
        await db_1.default.query('INSERT INTO providers (user_id, bio, wallet_balance) VALUES (?, ?, 0.00)', [userId, bio]);
    }
    async updateAvatar(userId, key) {
        await db_1.default.query('UPDATE users SET avatar_url = ? WHERE id = ?', [key, userId]);
    }
    async updateAvatarBlob(userId, blob) {
        await db_1.default.query('UPDATE users SET avatar_blob = ? WHERE id = ?', [blob, userId]);
    }
    async getAvatarBlob(userId) {
        const [rows] = await db_1.default.query('SELECT avatar_blob FROM users WHERE id = ?', [userId]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return row.avatar_blob ? Buffer.from(row.avatar_blob) : null;
    }
}
exports.UserRepository = UserRepository;
