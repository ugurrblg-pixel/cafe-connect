import { cn } from '@/lib/utils';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useI18n } from '@/contexts/I18nContext';
import { isActiveNow } from '@/lib/activityTime';
import { Loader2 } from 'lucide-react';

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
  onClick: () => void;
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
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  onClick,
}: InboxItemProps) {
  const { t } = useI18n();
  const isOnline = isActiveNow(lastActiveAt);
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3',
        'transition-all duration-150 ease-out',
        'hover:bg-secondary/60 active:bg-secondary/80 active:scale-[0.99]',
        hasUnread && 'bg-secondary/30'
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        {userPhotoUrl ? (
          <img
            src={userPhotoUrl}
            alt={userName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar 
            name={userName} 
            size="md" 
            className="w-12 h-12"
          />
        )}
        {/* Online indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        {/* Top row: Name + Time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'text-[15px] truncate',
            hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
          )}>
            {userName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatSmartTime(lastMessageTime, t)}
          </span>
        </div>

        {/* Middle row: Last message or typing */}
        <div className="flex items-center gap-2">
          {isTyping ? (
            <span className="text-sm text-primary italic flex items-center gap-1">
              {t.chat.typing}
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </span>
          ) : lastMessage ? (
            <span className={cn(
              'text-sm truncate',
              hasUnread ? 'text-foreground/80' : 'text-muted-foreground'
            )}>
              {lastMessage}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60 italic">
              {t.messages.matchedAt.replace('{cafe}', cafeName || 'a cafe')}
            </span>
          )}
        </div>

        {/* Bottom row: Cafe badge */}
        {cafeName && lastMessage && (
          <div className="mt-1">
            <span className="text-[11px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded">
              {cafeName}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Unread badge or loading */}
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : hasUnread ? (
          <span className="min-w-5 h-5 px-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}
