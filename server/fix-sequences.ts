import { pool } from "./db";

async function fixSequences() {
  const client = await pool.connect();
  try {
    console.log("--- Memulai Perbaikan Sequence Database ---");

    const tables = [
      { name: "opname_sessions", id: "id" },
      { name: "opname_records", id: "id" },
      { name: "products", id: "id" },
      { name: "product_photos", id: "id" },
      { name: "product_units", id: "id" },
      { name: "staff_members", id: "id" },
      { name: "announcements", id: "id" },
      { name: "feedback", id: "id" },
      { name: "motivation_messages", id: "id" },
      { name: "user_roles", id: "id" }
    ];

    for (const table of tables) {
      const seqNameRes = await client.query(`
        SELECT pg_get_serial_sequence($1, $2) as seq
      `, [table.name, table.id]);
      
      const seqName = seqNameRes.rows[0].seq;
      
      if (seqName) {
        console.log(`Memperbaiki sequence untuk tabel: ${table.name} (${seqName})...`);
        await client.query(`
          SELECT setval($1, COALESCE((SELECT MAX(${table.id}) FROM ${table.name}), 0) + 1, false)
        `, [seqName]);
      } else {
        console.log(`Sequence tidak ditemukan untuk tabel: ${table.name}`);
      }
    }

    console.log("--- Perbaikan Sequence Selesai! ---");
  } catch (err) {
    console.error("Gagal memperbaiki sequence:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixSequences();
