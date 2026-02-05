import { User } from '@/types';
import { PurposeBadge } from './PurposeBadge';
import { InitialsAvatar } from './InitialsAvatar';
import { cn } from '@/lib/utils';
import { MessageCircle, Hand, Coffee, Eye } from 'lucide-react';

interface UserCardProps {
  user: User;
  onMessage?: () => void;
  onInteraction?: (type: 'wave' | 'coffee' | 'eye') => void;
  onTap?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function UserCard({ user, onMessage, onInteraction, onTap, className, style }: UserCardProps) {
  const timeAgo = user.checkedInAt
    ? Math.floor((Date.now() - user.checkedInAt.getTime()) / 60000)
    : 0;

  const displayName = user.displayName || user.name;

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
          />
        ) : (
          <InitialsAvatar name={displayName} size="md" />
        )}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-card" />
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
        <p className="text-xs text-muted-foreground">
          Here for {timeAgo} min
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        {user.allowDMs && (
          <button
            onClick={onMessage}
            className="interaction-btn text-primary"
            aria-label="Send message"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => onInteraction?.('wave')}
            className="interaction-btn w-9 h-9"
            aria-label="Wave"
          >
            <Hand className="w-4 h-4" />
          </button>
          <button
            onClick={() => onInteraction?.('coffee')}
            className="interaction-btn w-9 h-9"
            aria-label="Coffee invite"
          >
            <Coffee className="w-4 h-4" />
          </button>
          <button
            onClick={() => onInteraction?.('eye')}
            className="interaction-btn w-9 h-9"
            aria-label="Eye contact"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
