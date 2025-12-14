"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRepository = void 0;
const db_1 = __importDefault(require("../database/db"));
class ChatRepository {
    async sendMessage(msg) {
        const [result] = await db_1.default.query('INSERT INTO chat_messages (service_id, sender_id, content, type) VALUES (?, ?, ?, ?)', [msg.service_id, msg.sender_id, msg.content, msg.type || 'text']);
        return result.insertId;
    }
    async getMessages(serviceId) {
        const [rows] = await db_1.default.query(`SELECT m.*, u.full_name as sender_name, u.role as sender_role
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.service_id = ?
       ORDER BY m.sent_at ASC`, [serviceId]);
        return rows;
    }
}
exports.ChatRepository = ChatRepository;
