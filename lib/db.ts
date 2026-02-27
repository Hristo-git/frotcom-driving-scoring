
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Use a global variable to prevent multiple pools in development
let pool: Pool;

declare global {
    var postgresPool: Pool | undefined;
}

if (!global.postgresPool) {
    global.postgresPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
}

pool = global.postgresPool;

export default pool;
