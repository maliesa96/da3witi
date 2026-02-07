import { createClient } from './client';

const BUCKET_NAME = 'event-media';

export type MediaType = 'image' | 'document';

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
  mediaType?: MediaType;
}

/**
 * Determines the media type based on file MIME type
 */
export function getMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  return 'document';
}

/**
 * Validates file type for WhatsApp compatibility
 * Supported: JPEG, PNG for images; PDF for documents
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, PDF`
    };
  }

  // Max file size limit: 10MB for PDFs, 5MB for images
  const maxSize = file.type === 'application/pdf' 
    ? 10 * 1024 * 1024  // 10MB for PDFs
    : 5 * 1024 * 1024;   // 5MB for images
  
  if (file.size > maxSize) {
    const maxSizeMB = file.type === 'application/pdf' ? '10MB' : '5MB';
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}`
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to Supabase Storage and returns a public URL
 */
export async function uploadEventMedia(
  file: File,
  eventId?: string
): Promise<UploadResult> {
  // Validate file type
  const validation = validateFileType(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const supabase = createClient();

  // Generate a unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop() || 'bin';
  const prefix = eventId ? `events/${eventId}` : 'uploads';
  const fileName = `${prefix}/${timestamp}-${randomId}.${extension}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      mediaType: getMediaType(file)
    };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Deletes a file from Supabase Storage
 */
export async function deleteEventMedia(filePath: string): Promise<boolean> {
  const supabase = createClient();

  try {
    // Extract path from full URL if needed
    const path = filePath.includes(BUCKET_NAME)
      ? filePath.split(`${BUCKET_NAME}/`)[1]
      : filePath;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    return false;
  }
}


