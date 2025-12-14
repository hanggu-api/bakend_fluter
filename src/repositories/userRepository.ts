import pool from '../database/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User {
    id?: number;
    email: string;
    password_hash: string;
    full_name: string;
    role: 'client' | 'provider' | 'admin';
    phone?: string;
}

export class UserRepository {
    async findById(id: number): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? (rows[0] as User) : null;
    }
    async findByEmail(email: string): Promise<User | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows.length > 0 ? (rows[0] as User) : null;
    }

    async create(user: User): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO users (email, password_hash, full_name, role, phone) VALUES (?, ?, ?, ?, ?)',
            [user.email, user.password_hash, user.full_name, user.role, user.phone]
        );
        return result.insertId;
    }

    async createProvider(userId: number, bio: string = ''): Promise<void> {
        await pool.query(
            'INSERT INTO providers (user_id, bio, wallet_balance) VALUES (?, ?, 0.00)',
            [userId, bio]
        );
    }

    async updateAvatar(userId: number, key: string): Promise<void> {
        await pool.query(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [key, userId]
        );
    }

    async updateAvatarBlob(userId: number, blob: Buffer): Promise<void> {
        await pool.query(
            'UPDATE users SET avatar_blob = ? WHERE id = ?',
            [blob, userId]
        );
    }

    async getAvatarBlob(userId: number): Promise<Buffer | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT avatar_blob FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length === 0) return null;
        const row = rows[0] as any;
        return row.avatar_blob ? Buffer.from(row.avatar_blob as Buffer) : null;
    }
}
