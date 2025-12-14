import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;
const ensurePool = () => {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT) || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool!;
};

export default {
    query: (...args: any[]) => ensurePool().query.apply(ensurePool(), args as any),
    getConnection: (...args: any[]) => ensurePool().getConnection.apply(ensurePool(), args as any),
};
