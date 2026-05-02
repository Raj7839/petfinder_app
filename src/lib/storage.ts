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
      try {
        const res = await fetch(fileOrBase64);
        body = await res.blob();
      } catch (e) {
        console.error('Failed to convert base64 to blob:', e);
        throw new Error('Image processing failed');
      }
    } else {
      body = fileOrBase64;
    }

    console.log(`Attempting upload to bucket "${BUCKET_NAME}" as "${name}"...`);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(name, body, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('Upload successful! URL:', publicUrl);
    return publicUrl;
  } catch (error: any) {
    console.error('Error in uploadAnimalPhoto:', error.message || error);
    return null;
  }
}
