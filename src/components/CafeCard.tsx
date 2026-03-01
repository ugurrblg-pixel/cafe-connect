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
        boxShadow: '0 2px 16px -2px hsl(18 30% 50% / 0.08)',
        ...style,
      }}
    >
      {/* Image */}
      <div className="relative">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          className="h-40"
          aspectRatio="hero"
        />

        {/* Active users badge */}
        {cafe.activeUsers > 0 && (
          <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            {formatActiveUserCount(cafe.activeUsers)} {t.common.here}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-bold text-foreground text-base">{cafe.name}</h3>
          {/* Open/Closed badge */}
          {cafe.isOpen === true && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent/15 text-accent">
              {t.cafeStatus?.open || 'Açık'}
            </span>
          )}
          {cafe.isOpen === false && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive">
              {t.cafeStatus?.closed || 'Kapalı'}
            </span>
          )}
        </div>

        {cafe.distance && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{cafe.distance}</span>
          </div>
        )}
      </div>
    </button>
  );
});
