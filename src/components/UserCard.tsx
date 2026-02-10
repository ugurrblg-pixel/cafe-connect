import { User } from '@/types';
import { PurposeBadge } from './PurposeBadge';
import { InitialsAvatar } from './InitialsAvatar';
import { cn } from '@/lib/utils';
import { MessageCircle, Hand, Check, Loader2, Heart, Clock } from 'lucide-react';
import { formatLastActive, getActivityLabel } from '@/lib/activityTime';

type WaveState = 'none' | 'waved' | 'received' | 'matched';

interface UserCardProps {
  user: User;
  onMessage?: () => void;
  onInteraction?: (type: 'wave' | 'coffee' | 'eye') => void;
  onTap?: () => void;
  waveState?: WaveState;
  isWaving?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function UserCard({ user, onMessage, onInteraction, onTap, waveState = 'none', isWaving = false, className, style }: UserCardProps) {
  const timeAgo = user.checkedInAt
    ? Math.floor((Date.now() - user.checkedInAt.getTime()) / 60000)
    : 0;

  const displayName = user.displayName || user.name;
  const activity = getActivityLabel(user.lastActiveAt);
  const activityText = formatLastActive(user.lastActiveAt);

  return (
    <div
      className={cn(
        'card-elevated p-4 flex items-start gap-4 animate-slide-up',
        onTap && 'cursor-pointer active:scale-[0.98] transition-transform',
        className
      )}
      style={style}
      onClick={onTap}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={displayName}
            className="w-16 h-16 rounded-2xl object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <InitialsAvatar name={displayName} size="md" className={user.photoUrl ? 'hidden' : ''} />
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground truncate">
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
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
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
            waveState === 'received' && 'bg-primary text-primary-foreground animate-pulse-soft',
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
  );
}
