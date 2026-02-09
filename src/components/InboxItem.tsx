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

// Smart timestamp formatting
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

export function InboxItem({
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
        'w-full flex items-center gap-3.5 px-4 py-3.5 select-none cursor-pointer',
        'transition-all duration-200 ease-out',
        'rounded-2xl mx-2 my-1',
        // Card-like appearance with shadow
        'bg-card/60 hover:bg-card shadow-sm hover:shadow-md',
        // Unread highlight
        hasUnread && 'bg-primary/5 shadow-md',
        // Premium user highlight
        isPremiumUser && hasUnread && 'bg-gradient-to-r from-amber-500/8 to-primary/5',
        isLoading && 'pointer-events-none opacity-60',
        // Smooth press feedback
        'active:scale-[0.98] active:shadow-sm'
      )}
    >
      {/* Avatar with online indicator and premium ring */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "rounded-full transition-transform duration-200",
          isPremiumUser && "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background"
        )}>
          {userPhotoUrl ? (
            <img
              src={userPhotoUrl}
              alt={userName}
              className="w-14 h-14 rounded-full object-cover shadow-sm"
            />
          ) : (
            <InitialsAvatar 
              name={userName} 
              size="md" 
              className="w-14 h-14 shadow-sm"
            />
          )}
        </div>
        {/* Online indicator - pulsing green dot */}
        {isOnline && (
          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-[2.5px] border-background shadow-sm">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
          </div>
        )}
        {/* Premium crown badge */}
        {isPremiumUser && !isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        {/* Top row: Name + Time */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'text-[15px] truncate',
              hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'
            )}>
              {userName}
            </span>
            {isPremiumUser && (
              <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <span className={cn(
            "text-xs flex-shrink-0 font-medium",
            hasUnread ? "text-primary" : "text-muted-foreground"
          )}>
            {formatSmartTime(lastMessageTime, t)}
          </span>
        </div>

        {/* Middle row: Last message or typing */}
        <div className="flex items-center gap-2">
          {/* Priority lightning for premium unread messages */}
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
            <span className="text-sm text-muted-foreground/60 italic">
              {cafeName ? `${cafeName} kafesinde eşleştiniz` : 'Yeni eşleşme'}
            </span>
          )}
        </div>

        {/* Bottom row: Cafe badge - more subtle */}
        {cafeName && lastMessage && (
          <div className="mt-1.5">
            <span className="text-[10px] text-muted-foreground/60 bg-secondary/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="w-1 h-1 bg-primary/40 rounded-full" />
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
            "min-w-6 h-6 px-2 text-xs font-bold rounded-full flex items-center justify-center shadow-sm",
            isPremiumUser 
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" 
              : "bg-primary text-primary-foreground"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}