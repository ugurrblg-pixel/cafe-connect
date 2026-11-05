import { encodeWebpFallback } from './webpFallback';

export const PRIVATE_PHOTO_PREFIX = 'avatar:';
const PHOTO_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;

export function privatePhotoPath(reference: string): string | null {
  if (!reference.startsWith(PRIVATE_PHOTO_PREFIX)) return null;
  const path = reference.slice(PRIVATE_PHOTO_PREFIX.length);
  return PHOTO_PATH.test(path) ? path : null;
}

export function privatePhotoReference(path: string): string {
  if (!PHOTO_PATH.test(path)) throw new Error('Geçersiz fotoğraf yolu');
  return PRIVATE_PHOTO_PREFIX + path;
}

// Re-encoding validates image data and excludes original EXIF/GPS metadata.
export async function prepareProfilePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('JPEG, PNG, WebP veya GIF dosyası seçin.');
  }
  if (file.size === 0 || file.size > 20 * 1024 * 1024) {
    throw new Error('Fotoğraf boş olmamalı ve en fazla 20 MB olmalı.');
  }
  // Image decoding through <img> also works in browsers without createImageBitmap.
  const objectUrl = URL.createObjectURL(file);
  const bitmap = new Image();
  try {
    bitmap.src = objectUrl;
    try { await bitmap.decode(); } catch {
      throw new Error('Bu fotoğraf okunamadı. JPEG, PNG veya WebP olarak kaydedip tekrar seçin.');
    }
    if (!bitmap.width || !bitmap.height || bitmap.width > 8192 || bitmap.height > 8192) {
      throw new Error('Fotoğraf boyutları çok büyük. Daha küçük bir fotoğraf seçin.');
    }
    const canvas = document.createElement('canvas');
    let needsFallback = false;
    for (const [edge, quality] of [[2048, 0.85], [1600, 0.75], [1200, 0.65]] as const) {
      const ratio = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Bu tarayıcı fotoğrafı hazırlayamadı.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let result: Blob | null = null;
      try {
        if (!needsFallback) result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        if (!result || result.type !== 'image/webp') needsFallback = true;
        if (needsFallback) result = await encodeWebpFallback(canvas, quality);
      } catch { /* A smaller canvas may succeed when the first allocation fails. */ }
      if (result?.type === 'image/webp' && result.size > 0 && result.size <= 5 * 1024 * 1024) return result;
    }
    throw new Error('Fotoğraf bu cihazda hazırlanamadı. Tarayıcıyı güncelleyip JPEG veya PNG bir fotoğrafla tekrar dene.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
