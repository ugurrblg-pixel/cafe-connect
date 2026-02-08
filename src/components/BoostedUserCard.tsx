import { User } from '@/types';
import { PurposeBadge } from './PurposeBadge';
import { InitialsAvatar } from './InitialsAvatar';
import { cn } from '@/lib/utils';
import { MessageCircle, Hand, Check, Loader2, Heart, Clock, Crown, Zap, Sparkles } from 'lucide-react';
import { formatLastActive, getActivityLabel } from '@/lib/activityTime';

type WaveState = 'none' | 'waved' | 'received' | 'matched';
type BadgeType = 'premium' | 'boost' | 'featured';

interface BoostedUserCardProps {
  user: User;
  onMessage?: () => void;
  onInteraction?: (type: 'wave' | 'coffee' | 'eye') => void;
  onTap?: () => void;
  waveState?: WaveState;
  isWaving?: boolean;
  className?: string;
  style?: React.CSSProperties;
  isBoosted?: boolean;
  isPremium?: boolean;
  badgeType?: BadgeType;
}

const BADGE_CONFIG: Record<BadgeType, { icon: React.ElementType; label: string; className: string }> = {
  premium: {
    icon: Crown,
    label: 'Premium',
    className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  },
  boost: {
    icon: Zap,
    label: 'Boost Aktif',
    className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  },
  featured: {
    icon: Sparkles,
    label: 'Öne Çıkan',
    className: 'bg-gradient-to-r from-amber-400 to-purple-500 text-white',
  },
};

export function BoostedUserCard({ 
  user, 
  onMessage, 
  onInteraction, 
  onTap, 
  waveState = 'none', 
  isWaving = false, 
  className, 
  style,
  isBoosted = false,
  isPremium = false,
  badgeType,
}: BoostedUserCardProps) {
  const timeAgo = user.checkedInAt
    ? Math.floor((Date.now() - user.checkedInAt.getTime()) / 60000)
    : 0;

  const displayName = user.displayName || user.name;
  const activity = getActivityLabel(user.lastActiveAt);
  const activityText = formatLastActive(user.lastActiveAt);

  const showEnhanced = isBoosted || isPremium;
  const badge = badgeType ? BADGE_CONFIG[badgeType] : null;
  const BadgeIcon = badge?.icon;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300',
        showEnhanced && 'p-[2px] bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600',
        className
      )}
      style={style}
    >
      {/* Animated glow for boosted users */}
      {showEnhanced && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-orange-500/30 to-purple-600/30 blur-xl animate-pulse" />
      )}

      <div
        className={cn(
          'relative bg-card p-4 flex items-start gap-4',
          showEnhanced ? 'rounded-[14px]' : 'card-elevated',
          onTap && 'cursor-pointer active:scale-[0.98] transition-transform'
        )}
        onClick={onTap}
      >
        {/* Badge */}
        {badge && BadgeIcon && (
          <div className={cn(
            'absolute -top-0 -right-0 flex items-center gap-1 px-2.5 py-1 rounded-bl-xl rounded-tr-2xl text-xs font-semibold shadow-lg z-10',
            badge.className
          )}>
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
        )}

        {/* Avatar with enhanced border */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'rounded-2xl overflow-hidden',
            showEnhanced && 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-card'
          )}>
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={displayName}
                className={cn(
                  'object-cover',
                  showEnhanced ? 'w-20 h-20' : 'w-16 h-16'
                )}
              />
            ) : (
              <InitialsAvatar name={displayName} size={showEnhanced ? 'lg' : 'md'} />
            )}
          </div>
          {/* Activity indicator dot */}
          <div 
            className={cn(
              'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card transition-colors',
              activity.isActive && 'bg-accent',
              activity.urgency === 'recent' && 'bg-warning',
              activity.urgency === 'stale' && 'bg-muted-foreground/50'
            )} 
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-16">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              'font-semibold text-foreground truncate',
              showEnhanced && 'text-lg'
            )}>
              {displayName}{user.age ? `, ${user.age}` : ''}
            </h3>
            <PurposeBadge purpose={user.purpose} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {user.bio}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(
              'flex items-center gap-1 transition-colors',
              activity.isActive && 'text-accent font-medium',
              activity.urgency === 'recent' && 'text-warning',
              activity.urgency === 'stale' && 'text-muted-foreground'
            )}>
              {!activity.isActive && <Clock className="w-3 h-3" />}
              {activityText}
            </span>
            <span className="opacity-50">·</span>
            <span>Here for {timeAgo}m</span>
          </div>

          {/* Boost hint text */}
          {showEnhanced && (
            <p className="text-xs text-primary/80 mt-2 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Boost aktifken daha fazla kişi seni görür
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Message button - only show if matched */}
          {waveState === 'matched' && (
            <button
              onClick={onMessage}
              className="interaction-btn text-primary"
              aria-label="Send message"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
          
          {/* Wave button with state */}
          <button
            onClick={() => onInteraction?.('wave')}
            disabled={isWaving || waveState === 'waved' || waveState === 'matched'}
            className={cn(
              'interaction-btn w-full min-w-[80px] px-3 py-2 flex items-center justify-center gap-1.5',
              waveState === 'matched' && 'bg-accent text-accent-foreground',
              waveState === 'waved' && 'bg-secondary text-muted-foreground',
              waveState === 'received' && 'bg-primary text-primary-foreground animate-pulse',
              waveState === 'none' && 'hover:bg-secondary'
            )}
            aria-label={
              waveState === 'matched' ? 'Matched' :
              waveState === 'waved' ? 'Wave sent' :
              waveState === 'received' ? 'Wave back' :
              'Wave'
            }
          >
            {isWaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : waveState === 'matched' ? (
              <>
                <Heart className="w-4 h-4" />
                <span className="text-xs font-medium">Matched</span>
              </>
            ) : waveState === 'waved' ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-xs font-medium">Waved</span>
              </>
            ) : waveState === 'received' ? (
              <>
                <Hand className="w-4 h-4" />
                <span className="text-xs font-medium">Wave back</span>
              </>
            ) : (
              <>
                <Hand className="w-4 h-4" />
                <span className="text-xs font-medium">Wave</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
