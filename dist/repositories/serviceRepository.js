"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRepository = void 0;
const db_1 = __importDefault(require("../database/db"));
const config_1 = require("../utils/config");
const uuid_1 = require("uuid");
class ServiceRepository {
    // Creates a new service request
    async create(data) {
        const id = (0, uuid_1.v4)();
        await db_1.default.query(`INSERT INTO service_requests 
      (id, client_id, category_id, description, latitude, longitude, address, price_estimated, price_upfront, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`, [id, data.client_id, data.category_id, data.description, data.latitude, data.longitude, data.address, data.price_estimated, data.price_upfront]);
        return id;
    }
    // Find all requests for a specific client
    async findByClient(clientId) {
        const [rows] = await db_1.default.query(`SELECT s.*, c.name as category_name, c.icon_slug, p.full_name as provider_name 
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       LEFT JOIN users p ON s.provider_id = p.id
       WHERE s.client_id = ?
       ORDER BY s.created_at DESC`, [clientId]);
        return rows.map((r) => ({ ...r, provider_amount: (0, config_1.commissionNet)(Number(r.price_estimated)) }));
    }
    // Find all requests accepted by a specific provider
    async findByProvider(providerId) {
        const [rows] = await db_1.default.query(`SELECT s.*, c.name as category_name, c.icon_slug, 
              u.full_name as client_name, u.phone as client_phone, u.avatar_url as client_avatar
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users u ON s.client_id = u.id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC`, [providerId]);
        return rows.map((r) => ({ ...r, provider_amount: (0, config_1.commissionNet)(Number(r.price_estimated)) }));
    }
    // Find nearby pending requests for providers
    // (Simplified "nearby" for now: returns all pending)
    async findPendingForProvider() {
        const [rows] = await db_1.default.query(`SELECT s.*, c.name as category_name, u.full_name as client_name, u.avatar_url as client_avatar
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users u ON s.client_id = u.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`);
        return rows.map((r) => ({ ...r, provider_amount: (0, config_1.commissionNet)(Number(r.price_estimated)) }));
    }
    // Find specific service details
    async findById(id) {
        const [rows] = await db_1.default.query(`SELECT s.*, c.name as category_name, 
              client.full_name as client_name, client.phone as client_phone,
              provider.full_name as provider_name
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users client ON s.client_id = client.id
       LEFT JOIN users provider ON s.provider_id = provider.id
       WHERE s.id = ?`, [id]);
        if (rows.length === 0)
            return null;
        const r = rows[0];
        r.provider_amount = (0, config_1.commissionNet)(Number(r.price_estimated));
        return r;
    }
    // Atomically accept a service (Concurrency Safe)
    async acceptService(serviceId, providerId) {
        const [result] = await db_1.default.query(`UPDATE service_requests 
       SET status = 'accepted', provider_id = ? 
       WHERE id = ? AND status = 'pending'`, [providerId, serviceId]);
        return result.affectedRows > 0;
    }
    // Update status (e.g. in_progress, completed)
    async updateStatus(serviceId, status) {
        const [result] = await db_1.default.query(`UPDATE service_requests SET status = ? WHERE id = ?`, [status, serviceId]);
        return result.affectedRows > 0;
    }
}
exports.ServiceRepository = ServiceRepository;
