import { pool } from "./server/db";

async function main() {
    console.log("Memperbaiki nilai sequence di database...");

    try {
        const client = await pool.connect();

        // Ambil semua tabel di public schema
        const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);

        for (const row of result.rows) {
            const tableName = row.table_name;
            // Skip drizzle schema migration tables if any
            if (tableName === '__drizzle_migrations') continue;

            try {
                // Asumsi convention column "id" dan sequence name is "table_name_id_seq"
                const seqName = `${tableName}_id_seq`;

                // Cek apakah tabel punya kolom 'id'
                const hasIdRes = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'id'
        `, [tableName]);

                if (hasIdRes.rows.length > 0) {
                    // Set sequence equal to MAX(id)
                    await client.query(`
            SELECT setval(
              CAST('${seqName}' AS regclass),
              COALESCE((SELECT MAX(id) FROM "${tableName}") + 1, 1),
              false
            )
          `);
                    console.log(`✅ Sequence diset ulang untuk tabel: ${tableName}`);
                }
            } catch (err: any) {
                // Mengabaikan error jk urutannya beda nama atau bukan tipe serial
                console.log(`⚠️ Melewati tabel ${tableName}: ${(err as Error).message}`);
            }
        }

        client.release();
        console.log("✅ Semua sequence berhasil diperiksa dan diset!");
    } catch (error) {
        console.error("Gagal menjalankan script:", error);
    } finally {
        process.exit(0);
    }
}

main();
