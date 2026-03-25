
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Helper to mask password in connection strings for logging
function maskUrl(url: string) {
  try {
    return url.replace(/:([^:@]+)@/, ":****@");
  } catch {
    return "invalid-url";
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set (postgresql://user:pass@host:5432/dbname)");
}

// Auto-fallback for local development or host-based deployments: 
// If hostname is "db" but we're on Windows or NOT in a Docker environment
import fs from 'fs';
const isDocker = process.env.IS_DOCKER === 'true' || fs.existsSync('/.dockerenv');
if (databaseUrl.includes('@db') && (!isDocker || process.platform === 'win32')) {
  console.log('[db] Host "db" detected on non-docker/Windows environment. Switching to "localhost"...');
  databaseUrl = databaseUrl.replace('@db', '@localhost');
}

console.log(`[db] Memulai koneksi database...`);
console.log(`[db] Database URL: ${maskUrl(databaseUrl)}`);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Verifikasi koneksi saat startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[db] KONEKSI DATABASE GAGAL:', err.message);
    if (databaseUrl.includes('db:5432')) {
      console.warn('[db] Hint: Jika Postgres jalan di Docker tapi App jalan di PM2 (Host), gunakan "localhost" bukan "db" di file .env');
    }
  } else {
    console.log('[db] Koneksi database berhasil terhubung.');
    release();
  }
});


// Explicitly check connection once to log success/failure at startup
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
