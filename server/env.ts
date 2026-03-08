import fs from "fs";
import path from "path";

// Manual .env loader for compatibility across all Node versions and PM2 environments
try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        envContent.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                const firstEq = trimmed.indexOf("=");
                const key = trimmed.substring(0, firstEq).trim();
                let value = trimmed.substring(firstEq + 1).trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log("[env] File .env berhasil dimuat secara manual.");
    } else {
        console.warn("[env] File .env tidak ditemukan di:", envPath);
    }
} catch (e) {
    console.warn("[env] Gagal memuat file .env secara manual:", (e as any).message);
}
