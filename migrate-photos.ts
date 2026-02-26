import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import path from "path";

// --- CONFIGURATION ---
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Missing required environment variables: DATABASE_URL, SUPABASE_URL, or SUPABASE_ANON_KEY");
    process.exit(1);
}

// --- SETUP ---
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Bucket name sesuai Supabase Storage Anda
const BUCKET_NAME = "photos";

// API Internal Replit Object Storage
const REPLIT_API = "http://127.0.0.1:1106";

async function migrateUrl(oldUrl: string, folder: string): Promise<string | null> {
    try {
        // Ambil nama file asli dari URL
        // Contoh: "/objects/uploads/abc123.jpg" -> "abc123.jpg"
        const cleanFileName = path.basename(oldUrl);

        // Fetch file dari Replit Object Storage internal
        const res = await fetch(`${REPLIT_API}/uploads/${cleanFileName}`);
        if (!res.ok) {
            console.warn(`  ⚠️ Tidak ditemukan: ${cleanFileName} (HTTP ${res.status})`);
            return null;
        }
        const buf = Buffer.from(await res.arrayBuffer());

        // Upload ke Supabase Storage ke folder yang sesuai
        const uploadPath = `${folder}/${Date.now()}_${cleanFileName}`;
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(uploadPath, buf, { upsert: false });

        if (error) throw error;

        // Dapatkan URL publik dari Supabase
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (err) {
        console.error(`  ❌ Gagal:`, err);
        return null;
    }
}

async function migrate() {
    console.log("🚀 Mulai migrasi foto...");
    console.log(`🔗 Database: ${DATABASE_URL?.split('@')[1] || "unknown"}`);
    console.log(`☁️  Supabase bucket: ${BUCKET_NAME}\n`);

    try {
        // 1. Foto produk utama
        const prods = await db.execute("SELECT id, photo_url FROM products WHERE photo_url IS NOT NULL AND photo_url LIKE '/objects/%'");
        console.log(`📦 Produk utama: ${prods.rowCount} foto ditemukan`);
        for (const row of prods.rows) {
            const newUrl = await migrateUrl(row.photo_url as string, "product-photos");
            if (newUrl) {
                await db.execute(`UPDATE products SET photo_url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`  ✅ Produk ID ${row.id} berhasil`);
            }
        }

        // 2. Galeri foto produk
        const gallery = await db.execute("SELECT id, url FROM product_photos WHERE url IS NOT NULL AND url LIKE '/objects/%'");
        console.log(`\n🖼️  Galeri Produk: ${gallery.rowCount} foto ditemukan`);
        for (const row of gallery.rows) {
            const newUrl = await migrateUrl(row.url as string, "product-photos");
            if (newUrl) {
                await db.execute(`UPDATE product_photos SET url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`  ✅ Galeri ID ${row.id} berhasil`);
            }
        }

        // 3. Foto Opname Records (single)
        const opname = await db.execute("SELECT id, photo_url FROM opname_records WHERE photo_url IS NOT NULL AND photo_url LIKE '/objects/%'");
        console.log(`\n📝 Opname Records: ${opname.rowCount} foto ditemukan`);
        for (const row of opname.rows) {
            const newUrl = await migrateUrl(row.photo_url as string, "opname-photos");
            if (newUrl) {
                await db.execute(`UPDATE opname_records SET photo_url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`  ✅ Opname ID ${row.id} berhasil`);
            }
        }

        // 4. Galeri foto Opname (multi)
        const opnameGallery = await db.execute("SELECT id, url FROM opname_record_photos WHERE url IS NOT NULL AND url LIKE '/objects/%'");
        console.log(`\n📸 Galeri Opname: ${opnameGallery.rowCount} foto ditemukan`);
        for (const row of opnameGallery.rows) {
            const newUrl = await migrateUrl(row.url as string, "opname-photos");
            if (newUrl) {
                await db.execute(`UPDATE opname_record_photos SET url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`  ✅ Galeri Opname ID ${row.id} berhasil`);
            }
        }

        console.log("\n✨ Migrasi Selesai!");
    } catch (err) {
        console.error("\n💥 Migrasi gagal:", err);
    } finally {
        await pool.end();
    }
}

migrate();
