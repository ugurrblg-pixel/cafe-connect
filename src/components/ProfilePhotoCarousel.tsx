import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullscreenGallery } from './FullscreenGallery';

const DEFAULT_PLACEHOLDER = '/placeholder.svg';

interface ProfilePhotoCarouselProps {
  photos?: string[] | null;
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  enableFullscreen?: boolean;
}

export function ProfilePhotoCarousel({
  photos,
  avatarUrl,
  name,
  size = 'lg',
  className,
  enableFullscreen = true,
}: ProfilePhotoCarouselProps) {
  // Safe array: filter nulls/empty, fallback to avatarUrl, then placeholder
  const validPhotos = (photos ?? []).filter((p): p is string => typeof p === 'string' && p.trim() !== '');
  const displayPhotos =
    validPhotos.length > 0
      ? validPhotos
      : avatarUrl && avatarUrl.trim()
        ? [avatarUrl]
        : [];

  const hasPhotos = displayPhotos.length > 0;
  const hasMultiple = displayPhotos.length > 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clamp index
  const safeIndex = Math.max(0, Math.min(currentIndex, displayPhotos.length - 1));
  if (safeIndex !== currentIndex) setCurrentIndex(safeIndex);

  const getInitials = (n: string) =>
    n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-full aspect-square max-w-[280px]',
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultiple) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, [hasMultiple]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!hasMultiple) return;
    setTouchEnd(e.targetTouches[0].clientX);
  }, [hasMultiple]);

  const handleTouchEnd = useCallback(() => {
    if (!hasMultiple || touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) setCurrentIndex(i => Math.min(i + 1, displayPhotos.length - 1));
    if (distance < -50) setCurrentIndex(i => Math.max(i - 1, 0));
  }, [hasMultiple, touchStart, touchEnd, displayPhotos.length]);

  const handleNavClick = (direction: 'prev' | 'next') => {
    if (direction === 'next') setCurrentIndex(i => Math.min(i + 1, displayPhotos.length - 1));
    if (direction === 'prev') setCurrentIndex(i => Math.max(i - 1, 0));
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className={cn('relative rounded-2xl overflow-hidden bg-muted', sizeClasses[size])}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => enableFullscreen && hasPhotos && setGalleryOpen(true)}
        role={enableFullscreen && hasPhotos ? 'button' : undefined}
      >
        {hasPhotos ? (
          <div
            className="flex transition-transform duration-300 ease-out h-full"
            style={{
              transform: hasMultiple ? `translateX(-${safeIndex * 100}%)` : 'none',
              width: hasMultiple ? `${displayPhotos.length * 100}%` : '100%',
            }}
          >
            {displayPhotos.map((photo, index) => (
              <div
                key={index}
                className="w-full h-full flex-shrink-0"
                style={{ width: hasMultiple ? `${100 / displayPhotos.length}%` : '100%' }}
              >
                <CarouselImage src={photo} alt={`${name} photo ${index + 1}`} name={name} />
              </div>
            ))}
          </div>
        ) : (
          /* Initials fallback */
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-4xl font-bold text-primary">{getInitials(name)}</span>
          </div>
        )}

        {/* Navigation Arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleNavClick('prev'); }}
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity',
                safeIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-black/50'
              )}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNavClick('next'); }}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity',
                safeIndex === displayPhotos.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-black/50'
              )}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Dots */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {displayPhotos.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  index === safeIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Gallery */}
      {enableFullscreen && (
        <FullscreenGallery
          photos={displayPhotos}
          initialIndex={safeIndex}
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}

/** Single image with loading + error states */
function CarouselImage({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const getInitials = (n: string) =>
    n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  if (error) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
        <span className="text-4xl font-bold text-primary">{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
