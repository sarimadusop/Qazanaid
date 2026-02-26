import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { products, productPhotos, opnameRecords, opnameRecordPhotos } from "./shared/schema";
import { eq, like } from "drizzle-orm";

// 1. Jalankan script ini SETELAH docker-compose up -d
// 2. Pastikan .env sudah terisi DATABASE_URL_OLD (Supabase) dan DATABASE_URL_NEW (Local VPS)

const SUPABASE_DB = process.env.SUPABASE_DATABASE_URL || "postgresql://postgres.vvnjsyajcqhudwdnlkzq:Sarimadu2017@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
const LOCAL_DB = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/Qazanaid";

async function migrateData() {
    console.log("🚀 Memulai sinkronisasi data dari Supabase ke VPS Lokal...");

    const sourcePool = new pg.Pool({ connectionString: SUPABASE_DB });
    const targetPool = new pg.Pool({ connectionString: LOCAL_DB });
    
    const dbSource = drizzle(sourcePool);
    const dbTarget = drizzle(targetPool);

    try {
        console.log("📝 Step 1: Sinkronisasi data utama (Opsional jika sudah export/import SQL)...");
        // Catatan: Cara terbaik adalah pg_dump & pg_restore. 
        // Script ini fokus pada UPDATE URL foto agar point ke lokal.

        console.log("🖼️ Step 2: Mengubah URL Supabase/Replit ke folder lokal /uploads/...");

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

        await updateUrls("products", "photo_url");
        await updateUrls("product_photos", "url");
        await updateUrls("opname_records", "photo_url");
        await updateUrls("opname_record_photos", "url");

        console.log("\n✨ SINKRONISASI SELESAI!");
        console.log("Langkah selanjutnya:");
        console.log("1. Pastikan semua file .jpg dari Replit sudah di-copy ke folder 'uploads' di VPS.");
        console.log("2. Restart app: docker-compose restart app");

    } catch (err) {
        console.error("❌ Gagal migrasi:", err);
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

migrateData();
