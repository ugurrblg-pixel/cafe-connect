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
        'card-elevated overflow-hidden text-left w-full transition-transform active:scale-[0.98] animate-slide-up',
        className
      )}
      style={style}
    >
      {/* Image */}
      <div className="relative h-32">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          className="h-32"
          aspectRatio="hero"
        />
        {/* Active users badge */}
        {cafe.activeUsers > 0 && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Users className="w-3 h-3" />
            {formatActiveUserCount(cafe.activeUsers)} {t.common.here}
          </div>
        )}
        {/* Open/Closed badge */}
        <div
          className={cn(
            'absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5',
            cafe.isOpen
              ? 'bg-accent/90 text-accent-foreground'
              : 'bg-destructive/90 text-destructive-foreground'
          )}
        >
          <span className={cn(
            'w-2 h-2 rounded-full',
            cafe.isOpen ? 'bg-accent-foreground/60' : 'bg-destructive-foreground/60'
          )} />
          {cafe.isOpen ? (t.cafeStatus?.open || 'Açık') : (t.cafeStatus?.closed || 'Kapalı')}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-2">{cafe.name}</h3>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {cafe.distance && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{cafe.distance}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
});
