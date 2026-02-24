import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// --- CONFIGURATION ---
// These will be picked up from Replit environment variables
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
const BUCKET_NAME = "stockify-photos";

// We'll need the ObjectStorageService if photos are in Replit's proprietary storage
// Since we don't want to depend on the whole project structure, we'll use a fetch-based approach 
// to the Replit sidecar if needed, or assume they are in the 'uploads/' folder.

async function uploadToSupabase(filePath: string, fileName: string): Promise<string | null> {
    try {
        let fileBuffer: Buffer;

        // 1. Try local filesystem (standard uploads)
        if (fs.existsSync(filePath)) {
            fileBuffer = fs.readFileSync(filePath);
        } else {
            // 2. Try Replit Object Storage via internal sidecar (if applicable)
            // Standard Replit path is http://127.0.0.1:1106
            const objectName = filePath.replace(/^\//, "");
            const response = await fetch(`http://127.0.0.1:1106/${objectName}`);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuffer);
            } else {
                console.warn(`⚠️ Could not find file: ${filePath}`);
                return null;
            }
        }

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(`migrated/${Date.now()}_${fileName}`, fileBuffer, {
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (err) {
        console.error(`❌ Failed to migrate ${fileName}:`, err);
        return null;
    }
}

async function migrate() {
    console.log("🚀 Starting Photo Migration...");

    try {
        // 1. Migrate Product Photos (Main Table)
        const prods = await db.execute("SELECT id, photo_url FROM products WHERE photo_url IS NOT NULL AND photo_url NOT LIKE 'http%'");
        console.log(`📦 Found ${prods.rowCount} products to check...`);

        for (const row of prods.rows) {
            const oldUrl = row.photo_url as string;
            console.log(`  - Migrating product ${row.id}: ${oldUrl}`);
            const newUrl = await uploadToSupabase(oldUrl, `product_${row.id}${path.extname(oldUrl)}`);
            if (newUrl) {
                await db.execute(`UPDATE products SET photo_url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`    ✅ Success!`);
            }
        }

        // 2. Migrate Product Photos (Gallery Table)
        const gallery = await db.execute("SELECT id, url FROM product_photos WHERE url IS NOT NULL AND url NOT LIKE 'http%'");
        console.log(`🖼️ Found ${gallery.rowCount} gallery photos to check...`);

        for (const row of gallery.rows) {
            const oldUrl = row.url as string;
            const newUrl = await uploadToSupabase(oldUrl, `gallery_${row.id}${path.extname(oldUrl)}`);
            if (newUrl) {
                await db.execute(`UPDATE product_photos SET url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`    ✅ Success!`);
            }
        }

        // 3. Migrate Opname Photos
        const opname = await db.execute("SELECT id, photo_url FROM opname_records WHERE photo_url IS NOT NULL AND photo_url NOT LIKE 'http%'");
        console.log(`📝 Found ${opname.rowCount} opname records to check...`);

        for (const row of opname.rows) {
            const oldUrl = row.photo_url as string;
            const newUrl = await uploadToSupabase(oldUrl, `opname_${row.id}${path.extname(oldUrl)}`);
            if (newUrl) {
                await db.execute(`UPDATE opname_records SET photo_url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`    ✅ Success!`);
            }
        }

        // 4. Migrate Opname Multi-Photos
        const opnameGallery = await db.execute("SELECT id, url FROM opname_record_photos WHERE url IS NOT NULL AND url NOT LIKE 'http%'");
        console.log(`📸 Found ${opnameGallery.rowCount} opname gallery photos to check...`);

        for (const row of opnameGallery.rows) {
            const oldUrl = row.url as string;
            const newUrl = await uploadToSupabase(oldUrl, `opname_gallery_${row.id}${path.extname(oldUrl)}`);
            if (newUrl) {
                await db.execute(`UPDATE opname_record_photos SET url = '${newUrl}' WHERE id = ${row.id}`);
                console.log(`    ✅ Success!`);
            }
        }

        console.log("\n✨ Migration Finished!");
    } catch (err) {
        console.error("💥 Migration failed globally:", err);
    } finally {
        await pool.end();
    }
}

migrate();
