import { Cafe } from '@/types';
import { cn } from '@/lib/utils';
import { MapPin, Star, Users, Clock } from 'lucide-react';
import { getCafeStatus, getStatusColors } from '@/lib/openingHours';

interface CafeCardProps {
  cafe: Cafe;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function CafeCard({ cafe, onClick, className, style }: CafeCardProps) {
  // Get live status from opening hours
  const hoursStatus = getCafeStatus(cafe.openingHours);
  const statusColors = getStatusColors(hoursStatus.status);

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
      <div className="relative h-32 overflow-hidden bg-secondary">
        {cafe.imageUrl ? (
          <img
            src={cafe.imageUrl}
            alt={cafe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-1 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xl">☕</span>
              </div>
              <span className="text-xs text-muted-foreground">{cafe.name.slice(0, 15)}</span>
            </div>
          </div>
        )}
        {/* Active users badge */}
        {cafe.activeUsers > 0 && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Users className="w-3 h-3" />
            {cafe.activeUsers} here
          </div>
        )}
        {/* Status badge */}
        <div
          className={cn(
            'absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1',
            statusColors.bg,
            statusColors.text
          )}
        >
          {hoursStatus.status === 'closing-soon' && (
            <Clock className="w-3 h-3 animate-pulse" />
          )}
          {hoursStatus.status === 'open' ? 'Open' : 
           hoursStatus.status === 'closing-soon' ? 'Closing soon' : 
           hoursStatus.status === 'closed' ? 'Closed' : 'Hours unknown'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground">{cafe.name}</h3>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-medium">{cafe.rating}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {cafe.distance && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{cafe.distance}</span>
            </div>
          )}
          {/* Show opening hours info */}
          <div className={cn(
            'flex items-center gap-1 truncate',
            hoursStatus.status === 'closing-soon' && 'text-warning font-medium'
          )}>
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">{hoursStatus.label}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
