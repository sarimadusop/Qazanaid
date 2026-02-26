import pg from "pg";
import fs from "fs";

// PENTING: Jalankan ini di laptop lokal Anda (yang ada terminalnya)
const SUPABASE_DB = "postgresql://postgres.vvnjsyajcqhudwdnlkzq:Sarimadu2017@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

async function exportFullDatabase() {
    console.log("🚀 Menarik seluruh data dari Supabase... (Sabar ya)");
    
    const pool = new pg.Pool({ connectionString: SUPABASE_DB });
    const tables = [
        "users", // Dari auth
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
        "category_priorities"
    ];

    let sqlDump = "-- Kazana Full Database Dump\nSET statement_timeout = 0;\nSET client_encoding = 'UTF8';\n\n";

    try {
        for (const table of tables) {
            console.log(`📡 Membaca tabel: ${table}...`);
            try {
                const { rows, fields } = await pool.query(`SELECT * FROM ${table}`);
                if (rows.length === 0) continue;

                sqlDump += `\n-- Data for ${table}\n`;
                
                for (const row of rows) {
                    const columns = fields.map(f => `"${f.name}"`).join(", ");
                    const values = fields.map(f => {
                        const val = row[f.name];
                        if (val === null) return "NULL";
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return val;
                    }).join(", ");
                    
                    sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
                }
            } catch (e: any) {
                console.warn(`⚠️  Tabel ${table} dilewati atau tidak ada: ${e.message}`);
            }
        }

        fs.writeFileSync("vps_migration_backup.sql", sqlDump);
        console.log("\n✅ BERHASIL! File 'vps_migration_backup.sql' sudah dibuat.");
        console.log("File ini berisi semua data SO dan produk Anda.");
        console.log("\nLangkah selanjutnya: Copy file ini ke VPS!");

    } catch (err) {
        console.error("❌ Gagal total:", err);
    } finally {
        await pool.end();
    }
}

exportFullDatabase();
