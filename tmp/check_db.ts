
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("ERROR: databaseUrl is undefined. Check your .env file.");
    process.exit(1);
}

console.log("Connecting to:", databaseUrl.replace(/:([^:@]+)@/, ":****@"));

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
});

async function check() {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to the database.");
    const res = await client.query("SELECT NOW()");
    console.log("Query result:", res.rows[0]);
    client.release();
  } catch (err) {
    console.error("Database connection error:", err);
  } finally {
    await pool.end();
  }
}

check();
