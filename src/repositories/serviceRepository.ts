import pool from '../database/db';
import { commissionNet } from '../utils/config';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface ServiceRequest {
    id?: string;
    client_id: number;
    category_id: number;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    price_estimated: number;
    price_upfront: number;
    status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    provider_id?: number | null;
    created_at?: Date;
}

export class ServiceRepository {

    // Creates a new service request
    async create(data: ServiceRequest): Promise<string> {
        const id = uuidv4();
        await pool.query(
            `INSERT INTO service_requests 
      (id, client_id, category_id, description, latitude, longitude, address, price_estimated, price_upfront, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [id, data.client_id, data.category_id, data.description, data.latitude, data.longitude, data.address, data.price_estimated, data.price_upfront]
        );
        return id;
    }

    // Find all requests for a specific client
    async findByClient(clientId: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT s.*, c.name as category_name, c.icon_slug, p.full_name as provider_name 
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       LEFT JOIN users p ON s.provider_id = p.id
       WHERE s.client_id = ?
       ORDER BY s.created_at DESC`,
            [clientId]
        );
        return rows.map((r) => ({ ...r, provider_amount: commissionNet(Number(r.price_estimated)) }));
    }

    // Find all requests accepted by a specific provider
    async findByProvider(providerId: number): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT s.*, c.name as category_name, c.icon_slug, 
              u.full_name as client_name, u.phone as client_phone, u.avatar_url as client_avatar
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users u ON s.client_id = u.id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC`,
            [providerId]
        );
        return rows.map((r) => ({ ...r, provider_amount: commissionNet(Number(r.price_estimated)) }));
    }

    // Find nearby pending requests for providers
    // (Simplified "nearby" for now: returns all pending)
    async findPendingForProvider(): Promise<any[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT s.*, c.name as category_name, u.full_name as client_name, u.avatar_url as client_avatar
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users u ON s.client_id = u.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
        );
        return rows.map((r) => ({ ...r, provider_amount: commissionNet(Number(r.price_estimated)) }));
    }

    // Find specific service details
    async findById(id: string): Promise<any | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT s.*, c.name as category_name, 
              client.full_name as client_name, client.phone as client_phone,
              provider.full_name as provider_name
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users client ON s.client_id = client.id
       LEFT JOIN users provider ON s.provider_id = provider.id
       WHERE s.id = ?`,
            [id]
        );
        if (rows.length === 0) return null;
        const r: any = rows[0];
        r.provider_amount = commissionNet(Number(r.price_estimated));
        return r;
    }

    // Atomically accept a service (Concurrency Safe)
    async acceptService(serviceId: string, providerId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE service_requests 
       SET status = 'accepted', provider_id = ? 
       WHERE id = ? AND status = 'pending'`,
            [providerId, serviceId]
        );
        return result.affectedRows > 0;
    }

    // Update status (e.g. in_progress, completed)
    async updateStatus(serviceId: string, status: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE service_requests SET status = ? WHERE id = ?`,
            [status, serviceId]
        );
        return result.affectedRows > 0;
    }
}
