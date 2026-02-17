/**
 * Format active user count for display
 * If < 10 → exact number
 * If >= 10 → "10+"
 * If >= 25 → "25+"
 * If >= 50 → "50+"
 */
export function formatActiveUserCount(count: number): string {
  if (count >= 50) return '50+';
  if (count >= 25) return '25+';
  if (count >= 10) return '10+';
  return String(count);
}

/**
 * Filter photos based on viewer premium status and target user premium status.
 * 
 * Rules:
 * - FREE viewer → can see only first photo of FREE users
 * - FREE viewer → can see ALL photos of PREMIUM users
 * - PREMIUM viewer → can see ALL photos of everyone
 */
export function filterPhotosForViewer(
  photos: string[],
  isViewerPremium: boolean,
  isTargetPremium: boolean
): string[] {
  if (!photos || photos.length === 0) return [];
  
  // Premium viewers see everything
  if (isViewerPremium) return photos;
  
  // Free viewers see all photos of premium users
  if (isTargetPremium) return photos;
  
  // Free viewers see only first photo of free users
  return [photos[0]];
}
