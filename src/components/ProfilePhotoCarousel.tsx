import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePhotoCarouselProps {
  photos: string[];
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProfilePhotoCarousel({ 
  photos, 
  name,
  size = 'lg',
  className 
}: ProfilePhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const validPhotos = photos.filter(Boolean);
  const displayPhotos = validPhotos.length > 0 ? validPhotos : [''];
  const hasMultiple = displayPhotos.length > 1;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-full aspect-square max-w-[280px]',
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultiple) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!hasMultiple) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!hasMultiple || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentIndex < displayPhotos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (distance < -50 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNavClick = (direction: 'prev' | 'next') => {
    if (direction === 'next' && currentIndex < displayPhotos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative rounded-2xl overflow-hidden bg-muted',
          sizeClasses[size]
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Photos */}
        <div 
          className="flex transition-transform duration-300 ease-out h-full"
          style={{ 
            transform: hasMultiple ? `translateX(-${currentIndex * 100}%)` : 'none',
            width: hasMultiple ? `${displayPhotos.length * 100}%` : '100%'
          }}
        >
          {displayPhotos.map((photo, index) => (
            <div 
              key={index} 
              className="w-full h-full flex-shrink-0"
              style={{ width: hasMultiple ? `${100 / displayPhotos.length}%` : '100%' }}
            >
              {photo ? (
                <img
                  src={photo}
                  alt={`${name} photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">
                    {getInitials(name)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={() => handleNavClick('prev')}
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity',
                currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-black/50'
              )}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => handleNavClick('next')}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity',
                currentIndex === displayPhotos.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-black/50'
              )}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {displayPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  index === currentIndex 
                    ? 'bg-white w-4' 
                    : 'bg-white/50 hover:bg-white/70'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
