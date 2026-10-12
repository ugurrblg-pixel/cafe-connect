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
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error('Fotoğraf boş olmamalı ve en fazla 5 MB olmalı.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 8192 || bitmap.height > 8192) {
      throw new Error('Fotoğraf boyutları çok büyük. Daha küçük bir fotoğraf seçin.');
    }
    const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Bu tarayıcı fotoğrafı hazırlayamadı.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!result || result.type !== 'image/webp' || result.size > 5 * 1024 * 1024) {
      throw new Error('Fotoğraf hazırlanamadı. Başka bir fotoğraf deneyin.');
    }
    return result;
  } finally {
    bitmap.close();
  }
}
