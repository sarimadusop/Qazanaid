import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    // We'll throw an error if these are missing in production to prevent silent failures
    console.warn("SUPABASE_URL or SUPABASE_ANON_KEY is missing. Storage won't work.");
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export class StorageService {
    private bucketName = 'kazana-photos';

    async uploadFile(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
        const { data, error } = await supabase.storage
            .from(this.bucketName)
            .upload(`uploads/${Date.now()}_${fileName}`, fileBuffer, {
                contentType,
                upsert: false
            });

        if (error) {
            throw new Error(`Supabase upload failed: ${error.message}`);
        }

        // Return the public URL
        const { data: { publicUrl } } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(data.path);

        return publicUrl;
    }

    async deleteFile(url: string): Promise<void> {
        // Extract path from public URL if possible, or handle accordingly
        // For now, we'll implement a robust way to get the path
        const path = url.split(`${this.bucketName}/`)[1];
        if (path) {
            await supabase.storage.from(this.bucketName).remove([path]);
        }
    }
}

export const storageService = new StorageService();
