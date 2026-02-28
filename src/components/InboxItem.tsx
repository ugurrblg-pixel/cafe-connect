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
        'w-full flex items-center gap-3.5 px-3 py-4 select-none cursor-pointer',
        'transition-all duration-200 ease-out',
        'rounded-2xl',
        'hover:bg-card/80',
        // Unread: card-like with shadow
        hasUnread && 'bg-card shadow-md border border-primary/10',
        // Premium unread: warm glow
        isPremiumUser && hasUnread && 'bg-gradient-to-r from-amber-50 to-card border-amber-500/15 dark:from-amber-500/10 dark:to-card',
        isLoading && 'pointer-events-none opacity-60',
        'active:scale-[0.98]'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "rounded-full",
          isPremiumUser && "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background"
        )}>
          {userPhotoUrl ? (
            <img
              src={userPhotoUrl}
              alt={userName}
              className="w-14 h-14 rounded-full object-cover shadow-md"
              loading="lazy"
            />
          ) : (
            <InitialsAvatar 
              name={userName} 
              size="md" 
              className="w-14 h-14 shadow-md text-base font-bold"
            />
          )}
        </div>
        {/* Online indicator - vivid green */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-[2.5px] border-background shadow-sm">
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
          </div>
        )}
        {isPremiumUser && !isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        {/* Name + Time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'text-[15px] truncate',
              hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground'
            )}>
              {userName}
            </span>
            {isPremiumUser && (
              <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <span className={cn(
            "text-xs flex-shrink-0 tabular-nums font-medium",
            hasUnread ? "text-primary" : "text-muted-foreground"
          )}>
            {formatSmartTime(lastMessageTime, t)}
          </span>
        </div>

        {/* Message preview */}
        <div className="flex items-center gap-1.5">
          {isPremiumUser && hasUnread && !isTyping && (
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
          {isTyping ? (
            <span className="text-sm text-primary font-medium flex items-center gap-1.5">
              yazıyor
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </span>
          ) : lastMessage ? (
            <span className={cn(
              'text-sm truncate leading-relaxed',
              hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {lastMessage}
            </span>
          ) : (
            <span className="text-sm text-primary/60 italic">
              {cafeName ? `${cafeName} mekanında eşleştiniz ✨` : 'Yeni eşleşme ✨'}
            </span>
          )}
        </div>

        {/* Cafe badge - more visible */}
        {cafeName && lastMessage && (
          <div className="mt-1.5">
            <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full" />
              {cafeName}
            </span>
          </div>
        )}
      </div>

      {/* Unread badge */}
      <div className="flex-shrink-0 w-8 flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : hasUnread ? (
          <span className={cn(
            "min-w-6 h-6 px-2 text-xs font-bold rounded-full flex items-center justify-center shadow-sm",
            isPremiumUser 
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/25" 
              : "bg-primary text-primary-foreground shadow-primary/20"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>
    </div>
  );
});
