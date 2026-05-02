import { supabase } from './supabaseClient';

const BUCKET_NAME = 'animal-photos';

/**
 * Uploads a base64 or File image to Supabase Storage and returns the public URL.
 */
export async function uploadAnimalPhoto(fileOrBase64: File | string, fileName?: string): Promise<string | null> {
  try {
    let body: File | Blob;
    let name = fileName || `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;

    if (typeof fileOrBase64 === 'string') {
      // Convert base64 to Blob
      const res = await fetch(fileOrBase64);
      body = await res.blob();
    } else {
      body = fileOrBase64;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(name, body, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo to Supabase Storage:', error);
    return null;
  }
}
