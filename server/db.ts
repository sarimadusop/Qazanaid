
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

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const localUrl = process.env.DATABASE_URL;

// On VPS, we prioritize localUrl (DATABASE_URL) to ensure we use the local Postgres.
// supabaseUrl is only used as a fallback.
let databaseUrl = localUrl || supabaseUrl;

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set.");
}

console.log(`[db] Memulai koneksi database...`);
console.log(`[db] Database URL: ${maskUrl(databaseUrl)}`);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Fail fast (5s) to allow better error visibility
});

// Explicitly check connection once to log success/failure at startup
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
