
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

// On VPS, we usually want DATABASE_URL (Local). 
// However, if SUPABASE_DATABASE_URL is provided, we check if it's reachable.
// For now, let's prioritize localUrl if we are in production-like environment with a local DB,
// or provide a clear log of what's chosen.
let databaseUrl = supabaseUrl || localUrl;

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
