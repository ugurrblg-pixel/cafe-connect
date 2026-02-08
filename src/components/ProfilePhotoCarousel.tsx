import { useState, useRef } from 'react';
import { Crown, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProfilePhotoCarouselProps {
  photos: string[];
  isPremium: boolean;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProfilePhotoCarousel({ 
  photos, 
  isPremium, 
  name,
  size = 'lg',
  className 
}: ProfilePhotoCarouselProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // For demo purposes, generate placeholder photos if not enough
  const displayPhotos = isPremium 
    ? [...photos, ...Array(Math.max(0, 3 - photos.length)).fill('')].slice(0, 3)
    : photos.slice(0, 1);

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
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (!isPremium && (isLeftSwipe || isRightSwipe)) {
      // Free user trying to swipe - show paywall
      setShowPaywall(true);
      return;
    }

    if (isPremium) {
      if (isLeftSwipe && currentIndex < displayPhotos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
      if (isRightSwipe && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const handleNavClick = (direction: 'prev' | 'next') => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    if (direction === 'next' && currentIndex < displayPhotos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <>
      <div className={cn('relative', className)}>
        {/* Photo Container */}
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
              transform: isPremium ? `translateX(-${currentIndex * 100}%)` : 'none',
              width: isPremium ? `${displayPhotos.length * 100}%` : '100%'
            }}
          >
            {displayPhotos.map((photo, index) => (
              <div 
                key={index} 
                className="w-full h-full flex-shrink-0"
                style={{ width: isPremium ? `${100 / displayPhotos.length}%` : '100%' }}
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

          {/* Badge - Premium Crown or Free Lock */}
          <div className="absolute top-3 right-3 z-10">
            {isPremium ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <Lock className="w-4 h-4 text-white/80" />
              </div>
            )}
          </div>

          {/* Navigation Arrows (Premium only, desktop) */}
          {isPremium && displayPhotos.length > 1 && (
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

          {/* Dots Indicator (Premium only) */}
          {isPremium && displayPhotos.length > 1 && (
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

        {/* Free User Text */}
        {!isPremium && (
          <button 
            onClick={() => setShowPaywall(true)}
            className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>+2 fotoğraf Premium'da</span>
          </button>
        )}
      </div>

      {/* Premium Paywall Modal */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-xl">Premium ile 2 fotoğraf daha gör</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Premium üyeler tüm profil fotoğraflarını görebilir ve daha detaylı profiller oluşturabilir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">3 profil fotoğrafı</p>
                <p className="text-xs text-muted-foreground">Kendini daha iyi tanıt</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Tüm fotoğrafları gör</p>
                <p className="text-xs text-muted-foreground">Başkalarının fotoğraflarına eriş</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => {
                setShowPaywall(false);
                navigate('/subscription');
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              Premium'a Geç
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowPaywall(false)}
              className="text-muted-foreground"
            >
              Daha sonra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
