import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullscreenGalleryProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const DEFAULT_PLACEHOLDER = '/placeholder.svg';

export function FullscreenGallery({ photos, initialIndex = 0, open, onClose }: FullscreenGalleryProps) {
  const safePhotos = photos.filter(Boolean);
  const displayPhotos = safePhotos.length > 0 ? safePhotos : [DEFAULT_PLACEHOLDER];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dismissY, setDismissY] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const lastTapRef = useRef(0);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.min(initialIndex, displayPhotos.length - 1));
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      setDismissY(0);
      setIsDismissing(false);
    }
  }, [open, initialIndex, displayPhotos.length]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const getPinchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = getPinchDistance(e.touches);
      pinchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      // Double-tap to zoom
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        setScale(prev => prev > 1 ? 1 : 2.5);
        setTranslate({ x: 0, y: 0 });
      }
      lastTapRef.current = now;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = getPinchDistance(e.touches);
      const newScale = Math.max(1, Math.min(5, pinchStartScaleRef.current * (dist / pinchStartDistRef.current)));
      setScale(newScale);
      return;
    }

    if (!touchStartRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    if (scale > 1) {
      // Pan when zoomed
      setTranslate(prev => ({ x: prev.x + dx * 0.5, y: prev.y + dy * 0.5 }));
    } else {
      // Vertical drag to dismiss
      if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        setDismissY(dy);
      } else if (Math.abs(dx) > 30) {
        // Horizontal swipe between photos
      }
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    pinchStartDistRef.current = null;

    if (scale <= 1 && dismissY > 100) {
      setIsDismissing(true);
      setTimeout(onClose, 200);
      return;
    }

    if (scale <= 1) {
      // Check for horizontal swipe
      if (touchStartRef.current) {
        // Already handled via swipe tracker below
      }
      setDismissY(0);
    }

    if (scale <= 1) {
      setTranslate({ x: 0, y: 0 });
    }

    touchStartRef.current = null;
  }, [scale, dismissY, onClose]);

  // Separate swipe tracker for photo navigation
  const swipeStartRef = useRef<number | null>(null);

  const handleContainerTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale <= 1) {
      swipeStartRef.current = e.touches[0].clientX;
    }
    handleTouchStart(e);
  }, [handleTouchStart, scale]);

  const handleContainerTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartRef.current !== null && scale <= 1 && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - swipeStartRef.current;
      if (dx < -50 && currentIndex < displayPhotos.length - 1) {
        setCurrentIndex(i => i + 1);
      } else if (dx > 50 && currentIndex > 0) {
        setCurrentIndex(i => i - 1);
      }
    }
    swipeStartRef.current = null;
    handleTouchEnd(e);
  }, [handleTouchEnd, scale, currentIndex, displayPhotos.length]);

  if (!open) return null;

  const opacity = isDismissing ? 0 : Math.max(0.3, 1 - dismissY / 300);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: `rgba(0,0,0,${opacity})`, transition: isDismissing ? 'opacity 0.2s' : undefined }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Counter */}
      {displayPhotos.length > 1 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[101] text-white/80 text-sm font-medium">
          {currentIndex + 1} / {displayPhotos.length}
        </div>
      )}

      {/* Photo area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={handleContainerTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleContainerTouchEnd}
        style={{ transform: `translateY(${dismissY}px)`, transition: dismissY === 0 ? 'transform 0.2s' : undefined }}
      >
        <GalleryImage
          src={displayPhotos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          scale={scale}
          translate={translate}
        />
      </div>

      {/* Dots */}
      {displayPhotos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[101]">
          {displayPhotos.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setScale(1); setTranslate({ x: 0, y: 0 }); }}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === currentIndex ? 'bg-white w-5' : 'bg-white/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryImage({ src, alt, scale, translate }: { src: string; alt: string; scale: number; translate: { x: number; y: number } }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <img
        src={error ? DEFAULT_PLACEHOLDER : src}
        alt={alt}
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
          transition: scale === 1 ? 'transform 0.2s' : undefined,
          opacity: loaded || error ? 1 : 0,
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        draggable={false}
      />
    </div>
  );
}
