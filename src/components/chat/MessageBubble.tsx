import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { MessageActionMenu } from './MessageActionMenu';

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isOwn: boolean;
  isRead: boolean;
  showTimestamp?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isLastOwnMessage?: boolean;
  isFirstMessage?: boolean;
  isDeleted?: boolean;
  status?: 'sending' | 'sent' | 'failed';
  onRetry?: () => void;
  onDelete?: () => void;
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
  isFirstInGroup = true,
  isLastInGroup = true,
  isLastOwnMessage = false,
  isFirstMessage = false,
  isDeleted = false,
  status = 'sent',
  onRetry,
  onDelete,
}: MessageBubbleProps) {
  const { t, locale } = useI18n();
  const emojiOnly = useMemo(() => !isDeleted && isEmojiOnly(content), [content, isDeleted]);
  const longMessage = useMemo(() => isLongMessage(content), [content]);

  // Calculate border radius based on position in group
  const getBorderRadius = () => {
    const full = '20px';
    const tight = '6px';
    
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
          isLastInGroup ? 'mb-2.5' : 'mb-0.5'
        )}
      >
        <div className="px-3.5 py-2 rounded-2xl bg-secondary/40 border border-border/50">
          <p className="text-sm italic text-muted-foreground/60">
            {deletedText}
          </p>
        </div>
      </div>
    );
  }

  const bubbleContent = (
    <div
      className={cn(
        'flex flex-col animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
        isOwn ? 'items-end' : 'items-start',
        isLastInGroup ? 'mb-2.5' : 'mb-0.5',
        // First message gets a subtle highlight
        isFirstMessage && 'relative'
      )}
    >
      {/* First message badge */}
      {isFirstMessage && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">
          ✨
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[70%] shadow-sm transition-opacity duration-200',
          // Sending state - reduced opacity
          isSending && 'opacity-60',
          // Failed state - subtle red tint
          isFailed && 'opacity-90',
          // Emoji-only: no background, larger text
          emojiOnly
            ? 'bg-transparent shadow-none px-1 py-0.5'
            : 'px-3.5 py-2.5',
          // Bubble colors - warm palette
          !emojiOnly && isOwn && 'bg-primary text-primary-foreground',
          !emojiOnly && !isOwn && 'bg-secondary/80 text-foreground'
        )}
        style={{ borderRadius: emojiOnly ? '0' : getBorderRadius() }}
      >
        {/* Message content */}
        <p
          className={cn(
            'whitespace-pre-wrap break-words',
            emojiOnly
              ? 'text-4xl leading-none'
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
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px] font-medium',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {/* Status indicator for own messages */}
            {isOwn && (
              <>
                {isSending && (
                  <Clock className="w-3 h-3 text-primary-foreground/50 animate-pulse" />
                )}
                {isFailed && (
                  <AlertCircle className="w-3 h-3 text-destructive" />
                )}
                {status === 'sent' && isLastOwnMessage && (
                  <CheckCheck 
                    className={cn(
                      'w-3.5 h-3.5 transition-colors',
                      isRead 
                        ? 'text-accent-foreground' 
                        : 'text-primary-foreground/50'
                    )} 
                  />
                )}
                {status === 'sent' && !isLastOwnMessage && (
                  <Check className="w-3 h-3 text-primary-foreground/50" />
                )}
              </>
            )}
          </div>
        )}

        {/* Timestamp for emoji-only messages */}
        {isLastInGroup && emojiOnly && (
          <div className={cn(
            'flex items-center gap-1 mt-0.5',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] font-medium text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && isSending && (
              <Clock className="w-3 h-3 text-muted-foreground/50 animate-pulse" />
            )}
            {isOwn && isFailed && (
              <AlertCircle className="w-3 h-3 text-destructive" />
            )}
            {isOwn && status === 'sent' && isLastOwnMessage && (
              <CheckCheck 
                className={cn(
                  'w-3.5 h-3.5 transition-colors',
                  isRead ? 'text-primary' : 'text-muted-foreground/50'
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
          className="mt-1 text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
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
        onDelete={isOwn ? onDelete : undefined}
      >
        {bubbleContent}
      </MessageActionMenu>
    );
  }

  return bubbleContent;
}
