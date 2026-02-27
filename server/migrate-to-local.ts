import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { products, productPhotos, opnameRecords, opnameRecordPhotos } from "../shared/schema";
import { eq, like } from "drizzle-orm";

// 1. Jalankan script ini SETELAH docker-compose up -d
// 2. Pastikan .env sudah terisi DATABASE_URL_OLD (Supabase) dan DATABASE_URL_NEW (Local VPS)

const SUPABASE_DB = process.env.SUPABASE_DATABASE_URL || "postgresql://postgres.vvnjsyajcqhudwdnlkzq:Sarimadu2017@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
const LOCAL_DB = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/Qazanaid";

async function migrateData() {
    console.log("🚀 Memulai sinkronisasi data dari Supabase ke VPS Lokal...");

    const sourcePool = new pg.Pool({ connectionString: SUPABASE_DB });
    const targetPool = new pg.Pool({ connectionString: LOCAL_DB });

    try {
        console.log("📝 Step 1: Menyalin data tabel...");
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
            "category_priorities"
        ];

        for (const table of tables) {
            console.log(`📡 Menyalin tabel: ${table}...`);
            const { rows, fields } = await sourcePool.query(`SELECT * FROM ${table}`);
            if (rows.length === 0) {
                console.log(`ℹ️ Tabel ${table} kosong, dilewati.`);
                continue;
            }

            // Hapus data lama di target agar tidak duplikat atau bentrok (Opsional, gunakan ON CONFLICT jika lebih aman)
            // await targetPool.query(`TRUNCATE TABLE ${table} CASCADE`);

            for (const row of rows) {
                const columns = fields.map(f => `"${f.name}"`).join(", ");
                const values = fields.map((_, i) => `$${i + 1}`).join(", ");
                const params = fields.map(f => row[f.name]);
                
                // Gunakan ON CONFLICT DO NOTHING agar tidak error jika id sudah ada
                await targetPool.query(`INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING`, params);
            }
            console.log(`✅ ${table}: ${rows.length} baris diproses.`);
        }

        console.log("\n🖼️ Step 2: Mengubah URL Supabase/Replit ke folder lokal /uploads/...");

        const updateUrls = async (tableName: string, colName: string) => {
            const { rows } = await targetPool.query(`SELECT id, ${colName} as url FROM ${tableName} WHERE ${colName} IS NOT NULL`);
            let count = 0;
            for (const row of rows) {
                const url = row.url as string;
                if (url.includes("supabase.co") || url.includes("/objects/uploads/")) {
                    const fileName = url.split('/').pop();
                    const newLocalUrl = `/uploads/${fileName}`;
                    await targetPool.query(`UPDATE ${tableName} SET ${colName} = $1 WHERE id = $2`, [newLocalUrl, row.id]);
                    count++;
                }
            }
            console.log(`✅ ${tableName}.${colName}: ${count} URL diperbarui.`);
        };

        if (tables.includes("products")) await updateUrls("products", "photo_url");
        if (tables.includes("product_photos")) await updateUrls("product_photos", "url");
        if (tables.includes("opname_records")) await updateUrls("opname_records", "photo_url");
        if (tables.includes("opname_record_photos")) await updateUrls("opname_record_photos", "url");

        console.log("\n✨ SINKRONISASI SELESAI!");
        console.log("Sekarang silakan coba login di aplikasi.");

    } catch (err) {
        console.error("❌ Gagal migrasi:", err);
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

migrateData();
