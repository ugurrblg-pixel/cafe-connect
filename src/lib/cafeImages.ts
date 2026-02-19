/**
 * Cafe placeholder image utility
 * Provides deterministic fallback images for cafes without photos
 */

// Available placeholder images
const CAFE_PLACEHOLDERS = [
  '/placeholders/cafes/cafe-1.jpg',
  '/placeholders/cafes/cafe-2.jpg',
  '/placeholders/cafes/cafe-3.jpg',
  '/placeholders/cafes/cafe-4.jpg',
  '/placeholders/cafes/cafe-5.jpg',
  '/placeholders/cafes/cafe-6.jpg',
  '/placeholders/cafes/cafe-7.jpg',
  '/placeholders/cafes/cafe-8.jpg',
  '/placeholders/cafes/cafe-9.jpg',
  '/placeholders/cafes/cafe-10.jpg',
];

/**
 * Simple hash function to convert a string to a number
 * Used to deterministically select a placeholder based on cafe ID
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get the appropriate image for a cafe
 * Returns the cafe's own image if available, otherwise a deterministic placeholder
 * 
 * @param cafeId - Unique identifier for the cafe (used for placeholder selection)
 * @param imageUrl - The cafe's own image URL (optional)
 * @returns The image URL to use
 */
export function getCafeImage(cafeId: string, imageUrl?: string | null): string {
  // If cafe has a valid image URL, use it
  if (imageUrl && imageUrl.trim() !== '') {
    return imageUrl;
  }
  
  // Otherwise, deterministically select a placeholder based on cafe ID
  const index = hashString(cafeId) % CAFE_PLACEHOLDERS.length;
  return CAFE_PLACEHOLDERS[index];
}

/**
 * Get a fallback placeholder image
 * Used when the primary image fails to load
 * 
 * @param cafeId - Unique identifier for the cafe
 * @returns A placeholder image URL
 */
export function getCafeFallbackImage(cafeId: string): string {
  const index = hashString(cafeId) % CAFE_PLACEHOLDERS.length;
  return CAFE_PLACEHOLDERS[index];
}
