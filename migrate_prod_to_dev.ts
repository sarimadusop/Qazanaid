import pg from "pg";
import fs from "fs";

const devUrl = process.env.DATABASE_URL!;
const dataDir = "/tmp/prod_data";

async function exportFromProd() {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error("No JSON files found in /tmp/prod_data/");
    console.error("Run the export step first");
    process.exit(1);
  }
}

async function importToDev() {
  const client = new pg.Client({ connectionString: devUrl });
  await client.connect();
  console.log("Connected to development database");

  const tables = [
    "users",
    "user_roles",
    "products",
    "product_photos",
    "product_units",
    "opname_sessions",
    "opname_records",
    "opname_record_photos",
    "staff_members",
    "announcements",
    "feedback",
    "motivation_messages",
    "category_priorities",
  ];

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM sessions");
    for (const table of [...tables].reverse()) {
      console.log(`Clearing: ${table}`);
      await client.query(`DELETE FROM "${table}"`);
    }

    for (const table of tables) {
      const filePath = `${dataDir}/${table}.json`;
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${table} (no data file)`);
        continue;
      }

      const raw = fs.readFileSync(filePath, "utf-8").trim();
      if (!raw || raw === "null") {
        console.log(`Skipping ${table} (empty)`);
        continue;
      }

      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`Skipping ${table} (no rows)`);
        continue;
      }

      console.log(`Importing ${table}: ${data.length} rows`);
      let imported = 0;

      for (const row of data) {
        const cols = Object.keys(row);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const colNames = cols.map(c => `"${c}"`).join(", ");
        const values = cols.map(c => row[c]);

        await client.query(
          `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`,
          values
        );
        imported++;
      }
      console.log(`  Done: ${imported} rows`);
    }

    const serialTables = ["user_roles", "products", "product_photos", "product_units",
      "opname_sessions", "opname_records", "opname_record_photos",
      "staff_members", "announcements", "feedback", "motivation_messages", "category_priorities"];

    for (const table of serialTables) {
      try {
        await client.query(`
          SELECT setval(pg_get_serial_sequence('"${table}"', 'id'),
            COALESCE((SELECT MAX(id) FROM "${table}"), 1))
        `);
      } catch {}
    }

    await client.query("COMMIT");
    console.log("\nMigration completed successfully!");

    console.log("\nVerification:");
    for (const table of tables) {
      const { rows } = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      console.log(`  ${table}: ${rows[0].cnt} rows`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importToDev();
