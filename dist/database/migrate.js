"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./db"));
const migrate = async () => {
    try {
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        console.log('🔗 Connecting to database...');
        const connection = await db_1.default.getConnection();
        // Clean slate to prevent collation mismatches from partial previous runs
        console.log('🧹 Cleaning up old tables...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS chat_messages');
        await connection.query('DROP TABLE IF EXISTS transactions');
        await connection.query('DROP TABLE IF EXISTS service_requests');
        await connection.query('DROP TABLE IF EXISTS service_categories');
        await connection.query('DROP TABLE IF EXISTS providers');
        await connection.query('DROP TABLE IF EXISTS users');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('⚙️ Running migrations...');
        for (const statement of statements) {
            try {
                await connection.query(statement);
            }
            catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50) + '...', err);
                throw err;
            }
        }
        connection.release();
        console.log('✅ Migrations completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};
migrate();
