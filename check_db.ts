import fs from 'fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const env = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = env.match(/^DATABASE_URL=(.*)$/m);
if (!dbUrlMatch) throw new Error("No URL found");

const dbUrl = dbUrlMatch[1].trim();

const pool = new pg.Pool({ connectionString: dbUrl });
const db = drizzle(pool);

async function check() {
    try {
        const resLocal = await db.execute("SELECT COUNT(*) as count FROM opname_record_photos WHERE url LIKE '%uploads/%'");
        const resCloud = await db.execute("SELECT COUNT(*) as count FROM opname_record_photos WHERE url LIKE 'http%'");
        console.log('Local uploads:', resLocal.rows[0].count);
        console.log('Supabase URLs:', resCloud.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
