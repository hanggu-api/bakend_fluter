import fs from 'fs';
import path from 'path';
import pool from './db';

const migrate = async () => {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log('🔗 Connecting to database...');
        const connection = await pool.getConnection();

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
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50) + '...', err);
                throw err;
            }
        }

        connection.release();
        console.log('✅ Migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
