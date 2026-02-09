import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, AlertCircle, Crown } from 'lucide-react';
import { useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { MessageActionMenu } from './MessageActionMenu';

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isOwn: boolean;
  isRead: boolean;
  readAt?: Date;
  showTimestamp?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isLastOwnMessage?: boolean;
  isFirstMessage?: boolean;
  isDeleted?: boolean;
  status?: 'sending' | 'sent' | 'failed';
  isPremiumSender?: boolean;
  isPremiumViewer?: boolean;
  onRetry?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
}

// Check if message is emoji-only (1-3 emojis, no other text)
function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F){1,3}$/u;
  return emojiRegex.test(text.trim());
}

// Check if message is long (more than 100 chars)
function isLongMessage(text: string): boolean {
  return text.length > 100;
}

export function MessageBubble({
  content,
  timestamp,
  isOwn,
  isRead,
  readAt,
  isFirstInGroup = true,
  isLastInGroup = true,
  isLastOwnMessage = false,
  isFirstMessage = false,
  isDeleted = false,
  status = 'sent',
  isPremiumSender = false,
  isPremiumViewer = false,
  onRetry,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageBubbleProps) {
  const { t, locale } = useI18n();
  const emojiOnly = useMemo(() => !isDeleted && isEmojiOnly(content), [content, isDeleted]);
  const longMessage = useMemo(() => isLongMessage(content), [content]);

  // Calculate border radius based on position in group - more rounded for modern feel
  const getBorderRadius = () => {
    const full = '22px';
    const tight = '8px';
    
    if (isOwn) {
      if (isFirstInGroup && isLastInGroup) {
        return `${full} ${full} ${tight} ${full}`;
      } else if (isFirstInGroup) {
        return `${full} ${full} ${tight} ${full}`;
      } else if (isLastInGroup) {
        return `${full} ${tight} ${tight} ${full}`;
      } else {
        return `${full} ${tight} ${tight} ${full}`;
      }
    } else {
      if (isFirstInGroup && isLastInGroup) {
        return `${full} ${full} ${full} ${tight}`;
      } else if (isFirstInGroup) {
        return `${full} ${full} ${full} ${tight}`;
      } else if (isLastInGroup) {
        return `${tight} ${full} ${full} ${tight}`;
      } else {
        return `${tight} ${full} ${full} ${tight}`;
      }
    }
  };

  const isSending = status === 'sending';
  const isFailed = status === 'failed';

  const deletedText = locale === 'tr' ? 'Bu mesaj silindi' : 'This message was deleted';

  // Deleted message display
  if (isDeleted) {
    return (
      <div
        className={cn(
          'flex flex-col',
          isOwn ? 'items-end' : 'items-start',
          isLastInGroup ? 'mb-3' : 'mb-1'
        )}
      >
        <div className="px-4 py-2.5 rounded-2xl bg-secondary/50 border border-border/30">
          <p className="text-sm italic text-muted-foreground/50">
            {deletedText}
          </p>
        </div>
      </div>
    );
  }

  // Format "seen X minutes ago" for premium viewers
  const getSeenText = () => {
    if (!readAt) return null;
    const now = new Date();
    const diffMs = now.getTime() - readAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Şimdi görüldü';
    if (diffMins < 60) return `${diffMins} dk önce görüldü`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} saat önce görüldü`;
    return 'Görüldü';
  };

  const bubbleContent = (
    <div
      className={cn(
        'flex flex-col',
        // Smooth enter animation
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isOwn ? 'items-end' : 'items-start',
        isLastInGroup ? 'mb-3' : 'mb-1',
        // First message gets a subtle highlight
        isFirstMessage && 'relative'
      )}
    >
      {/* First message badge */}
      {isFirstMessage && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/10 to-amber-500/10 text-[10px] font-semibold text-primary flex items-center gap-1 shadow-sm">
          ✨ İlk mesaj
        </div>
      )}
      
      {/* Premium sender indicator for incoming messages */}
      {!isOwn && isPremiumSender && isFirstInGroup && (
        <div className="flex items-center gap-1 mb-1.5 ml-1">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Premium</span>
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[75%] transition-all duration-200 relative',
          // Sending state - reduced opacity with subtle pulse
          isSending && 'opacity-70',
          // Failed state - subtle red tint
          isFailed && 'opacity-90',
          // Emoji-only: no background, larger text
          emojiOnly
            ? 'bg-transparent shadow-none px-1 py-0.5'
            : 'px-4 py-3',
          // Bubble colors - warmer, more modern palette with shadows
          !emojiOnly && isOwn && 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md',
          !emojiOnly && !isOwn && 'bg-secondary/90 text-foreground shadow-sm',
          // Premium sender gold outline for incoming messages
          !emojiOnly && !isOwn && isPremiumSender && 'ring-1 ring-amber-500/40 shadow-amber-500/10'
        )}
        style={{ borderRadius: emojiOnly ? '0' : getBorderRadius() }}
      >
        {/* Message content */}
        <p
          className={cn(
            'whitespace-pre-wrap break-words',
            emojiOnly
              ? 'text-5xl leading-none'
              : longMessage
                ? 'text-[15px] leading-relaxed'
                : 'text-[15px] leading-snug'
          )}
        >
          {content}
        </p>
        
        {/* Timestamp and status - only show on last message in group */}
        {isLastInGroup && !emojiOnly && (
          <div className={cn(
            'flex items-center gap-1.5 mt-1.5',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px] font-medium',
              isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
            )}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {/* Status indicator for own messages */}
            {isOwn && (
              <>
                {isSending && (
                  <Clock className="w-3.5 h-3.5 text-primary-foreground/40 animate-pulse" />
                )}
                {isFailed && (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                )}
                {status === 'sent' && isLastOwnMessage && (
                  <>
                    <CheckCheck 
                      className={cn(
                        'w-4 h-4 transition-all duration-300',
                        isRead 
                          ? 'text-accent-foreground' 
                          : 'text-primary-foreground/40'
                      )} 
                    />
                  </>
                )}
                {status === 'sent' && !isLastOwnMessage && (
                  <Check className="w-3.5 h-3.5 text-primary-foreground/40" />
                )}
              </>
            )}
          </div>
        )}
        
        {/* Premium: Detailed read receipt below bubble */}
        {isOwn && isLastOwnMessage && status === 'sent' && isRead && isPremiumViewer && isLastInGroup && !emojiOnly && (
          <div className="text-[9px] text-primary-foreground/40 mt-1 text-right font-medium">
            {getSeenText()}
          </div>
        )}

        {/* Timestamp for emoji-only messages */}
        {isLastInGroup && emojiOnly && (
          <div className={cn(
            'flex items-center gap-1.5 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] font-medium text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && isSending && (
              <Clock className="w-3.5 h-3.5 text-muted-foreground/40 animate-pulse" />
            )}
            {isOwn && isFailed && (
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            )}
            {isOwn && status === 'sent' && isLastOwnMessage && (
              <CheckCheck 
                className={cn(
                  'w-4 h-4 transition-colors',
                  isRead ? 'text-primary' : 'text-muted-foreground/40'
                )} 
              />
            )}
          </div>
        )}
      </div>

      {/* Failed message - inline retry */}
      {isFailed && onRetry && (
        <button
          onClick={onRetry}
          className="mt-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1.5 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {t.chat.failedToSend}
        </button>
      )}
    </div>
  );

  // Wrap with action menu for sent messages
  if (status === 'sent') {
    return (
      <MessageActionMenu 
        content={content} 
        isOwn={isOwn}
        messageTimestamp={timestamp}
        onDeleteForMe={isOwn ? onDeleteForMe : undefined}
        onDeleteForEveryone={isOwn ? onDeleteForEveryone : undefined}
      >
        {bubbleContent}
      </MessageActionMenu>
    );
  }

  return bubbleContent;
}
