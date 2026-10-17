import { PrivateProfileImage } from '@/components/PrivateProfileImage';
import { memo } from 'react';
import { User } from '@/types';
import { PurposeBadge } from './PurposeBadge';
import { VerifiedBadge } from './VerifiedBadge';
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
  sparkButton?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const UserCard = memo(function UserCard({ user, onMessage, onInteraction, onTap, waveState = 'none', isWaving = false, sparkButton, className, style }: UserCardProps) {
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
        className
      )}
      style={style}
    >
      {/* Avatar */}
      <button type="button" onClick={onTap} disabled={!onTap} aria-label={`${displayName} profilini görüntüle`} className="relative flex-shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {user.photoUrl ? (
          <PrivateProfileImage
            src={user.photoUrl}
            alt={displayName}
            className="w-16 h-16 rounded-2xl object-cover"
            loading="lazy"
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
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground truncate">
            <button type="button" onClick={onTap} disabled={!onTap} className="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{displayName}{user.age ? `, ${user.age}` : ''}</button>
          </h3>
          {user.isVerified && <VerifiedBadge size="sm" />}
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
          <span>{timeAgo} dk burada</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Message button - only show if matched */}
        {waveState === 'matched' && (
          <button
            onClick={onMessage}
            className="interaction-btn text-primary"
            aria-label="Mesaj gönder"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
        
        {/* Spark button */}
        {sparkButton}

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
            waveState === 'matched' ? 'Eşleştiniz' :
            waveState === 'waved' ? 'Selam gönderildi' :
            waveState === 'received' ? 'Selamı yanıtla' :
            'Selam ver'
          }
        >
          {isWaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : waveState === 'matched' ? (
            <>
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">Eşleştiniz</span>
            </>
          ) : waveState === 'waved' ? (
            <>
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Gönderildi</span>
            </>
          ) : waveState === 'received' ? (
            <>
              <Hand className="w-4 h-4" />
              <span className="text-xs font-medium">Yanıtla</span>
            </>
          ) : (
            <>
              <Hand className="w-4 h-4" />
              <span className="text-xs font-medium">Selam ver</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
