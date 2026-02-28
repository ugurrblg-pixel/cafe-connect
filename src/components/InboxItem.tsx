import { memo } from 'react';
import { cn } from '@/lib/utils';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useI18n } from '@/contexts/I18nContext';
import { isActiveNow } from '@/lib/activityTime';
import { useLongPress } from '@/hooks/useLongPress';
import { Loader2, Zap, Crown } from 'lucide-react';

interface InboxItemProps {
  id: string;
  userName: string;
  userPhotoUrl?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  cafeName?: string;
  unreadCount: number;
  isTyping?: boolean;
  lastActiveAt?: Date;
  isLoading?: boolean;
  isPremiumUser?: boolean;
  onClick: () => void;
  onLongPress?: () => void;
}

function formatSmartTime(date: Date | undefined, t: any): string {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t.time.justNow;
  if (diffMins < 60) return `${diffMins}d`;
  if (diffHours < 24) return `${diffHours}s`;
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return date.toLocaleDateString('tr-TR', { weekday: 'short' });
  return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
}

export const InboxItem = memo(function InboxItem({
  userName,
  userPhotoUrl,
  lastMessage,
  lastMessageTime,
  cafeName,
  unreadCount,
  isTyping,
  lastActiveAt,
  isLoading,
  isPremiumUser = false,
  onClick,
  onLongPress,
}: InboxItemProps) {
  const { t } = useI18n();
  const isOnline = isActiveNow(lastActiveAt);
  const hasUnread = unreadCount > 0;

  const longPressHandlers = useLongPress({
    onLongPress: () => onLongPress?.(),
    onClick: onClick,
    delay: 500,
  });

  return (
    <div
      {...longPressHandlers}
      role="button"
      tabIndex={0}
      aria-disabled={isLoading}
      className={cn(
        'w-full flex items-center gap-3.5 px-3 py-3.5 select-none cursor-pointer',
        'transition-all duration-200 ease-out',
        'rounded-2xl',
        // Subtle hover state
        'hover:bg-secondary/50',
        // Unread highlight
        hasUnread && 'bg-primary/[0.04]',
        // Premium user highlight
        isPremiumUser && hasUnread && 'bg-gradient-to-r from-amber-500/[0.06] to-primary/[0.04]',
        isLoading && 'pointer-events-none opacity-60',
        'active:scale-[0.98] active:bg-secondary/60'
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "rounded-full transition-transform duration-200",
          isPremiumUser && "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-background"
        )}>
          {userPhotoUrl ? (
            <img
              src={userPhotoUrl}
              alt={userName}
              className="w-[52px] h-[52px] rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <InitialsAvatar 
              name={userName} 
              size="md" 
              className="w-[52px] h-[52px]"
            />
          )}
        </div>
        {/* Online indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2px] border-background">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
          </div>
        )}
        {/* Premium crown badge */}
        {isPremiumUser && !isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border-2 border-background">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        {/* Top row: Name + Time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'text-[15px] truncate',
              hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'
            )}>
              {userName}
            </span>
            {isPremiumUser && (
              <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <span className={cn(
            "text-[11px] flex-shrink-0 tabular-nums",
            hasUnread ? "text-primary font-semibold" : "text-muted-foreground/70"
          )}>
            {formatSmartTime(lastMessageTime, t)}
          </span>
        </div>

        {/* Message preview row */}
        <div className="flex items-center gap-2">
          {isPremiumUser && hasUnread && !isTyping && (
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
          {isTyping ? (
            <span className="text-[13px] text-primary font-medium flex items-center gap-1.5">
              yazıyor
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </span>
          ) : lastMessage ? (
            <span className={cn(
              'text-[13px] truncate leading-relaxed',
              hasUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground/70'
            )}>
              {lastMessage}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground/50 italic">
              {cafeName ? `${cafeName} mekanında eşleştiniz` : 'Yeni eşleşme ✨'}
            </span>
          )}
        </div>

        {/* Cafe badge */}
        {cafeName && lastMessage && (
          <div className="mt-1">
            <span className="text-[10px] text-muted-foreground/50 bg-secondary/50 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
              <span className="w-1 h-1 bg-primary/30 rounded-full" />
              {cafeName}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Unread badge or loading */}
      <div className="flex-shrink-0 w-7 flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : hasUnread ? (
          <span className={cn(
            "min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold rounded-full flex items-center justify-center",
            isPremiumUser 
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-500/20" 
              : "bg-primary text-primary-foreground"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>
    </div>
  );
});
