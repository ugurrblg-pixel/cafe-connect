import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getCafeImage, getCafeFallbackImage } from '@/lib/cafeImages';

interface CafeImageProps {
  cafeId: string;
  imageUrl?: string | null;
  alt: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'hero';
}

const aspectClasses = {
  video: 'aspect-video', // 16:9
  square: 'aspect-square',
  hero: 'h-56', // Fixed height for hero images
};

export function CafeImage({ 
  cafeId, 
  imageUrl, 
  alt, 
  className,
  aspectRatio = 'video'
}: CafeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Get the appropriate image source
  const imageSrc = hasError 
    ? getCafeFallbackImage(cafeId) 
    : getCafeImage(cafeId, imageUrl);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    // If the original image fails, switch to fallback
    if (!hasError) {
      setHasError(true);
      setIsLoading(true); // Reset loading state for fallback
    } else {
      // Even fallback failed, just hide loading state
      setIsLoading(false);
    }
  }, [hasError]);

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-secondary',
        aspectRatio !== 'hero' && aspectClasses[aspectRatio],
        aspectRatio === 'hero' && aspectClasses.hero,
        className
      )}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-secondary animate-pulse" />
      )}
      
      {/* Actual image */}
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}
