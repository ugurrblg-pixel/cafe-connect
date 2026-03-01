import { memo } from 'react';
import { Cafe } from '@/types';
import { cn } from '@/lib/utils';
import { MapPin, Users } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { CafeImage } from '@/components/CafeImage';
import { formatActiveUserCount } from '@/lib/photoAccess';

interface CafeCardProps {
  cafe: Cafe;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CafeCard = memo(function CafeCard({ cafe, onClick, className, style }: CafeCardProps) {
  const { t } = useI18n();

  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-card overflow-hidden text-left w-full transition-all duration-200 active:scale-[0.98] animate-slide-up rounded-[20px] border-0',
        className
      )}
      style={{
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {/* Image */}
      <div className="relative">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          className="h-44"
          aspectRatio="hero"
        />

        {/* Active users floating pill */}
        {cafe.activeUsers > 0 && (
          <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
            {formatActiveUserCount(cafe.activeUsers)} {t.common.here}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-semibold text-foreground text-[15px] leading-tight line-clamp-1">
            {cafe.name}
          </h3>
          {cafe.isOpen === true && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent/12 text-accent flex-shrink-0 ml-2">
              {t.cafeStatus?.open || 'Açık'}
            </span>
          )}
          {cafe.isOpen === false && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/8 text-destructive flex-shrink-0 ml-2">
              {t.cafeStatus?.closed || 'Kapalı'}
            </span>
          )}
        </div>

        {cafe.distance && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[13px]">{cafe.distance}</span>
          </div>
        )}
      </div>
    </button>
  );
});
