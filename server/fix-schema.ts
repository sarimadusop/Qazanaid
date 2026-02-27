import pg from "pg";

const LOCAL_DB = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/Qazanaid";

async function fixSchema() {
    console.log("🛠️ Memulai perbaikan manual struktur tabel opname_records...");
    const pool = new pg.Pool({ connectionString: LOCAL_DB });

    try {
        const client = await pool.connect();
        
        console.log("🔍 Mengecek kolom yang ada...");
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'opname_records'
        `);
        const existingCols = res.rows.map(r => r.column_name);

        const addCol = async (col: string, type: string) => {
            if (!existingCols.includes(col)) {
                console.log(`➕ Menambahkan kolom: ${col}...`);
                await client.query(`ALTER TABLE opname_records ADD COLUMN ${col} ${type}`);
                console.log(`✅ Kolom ${col} berhasil ditambahkan.`);
            } else {
                console.log(`ℹ️ Kolom ${col} sudah ada.`);
            }
        };

        await addCol("counted_by", "TEXT");
        await addCol("returned_quantity", "INTEGER DEFAULT 0");
        await addCol("returned_notes", "TEXT");

        console.log("\n✨ PERBAIKAN STRUKTUR SELESAI!");
        client.release();
    } catch (err: any) {
        console.error("❌ Gagal memperbaiki struktur:", err.message);
    } finally {
        await pool.end();
    }
}

fixSchema();
