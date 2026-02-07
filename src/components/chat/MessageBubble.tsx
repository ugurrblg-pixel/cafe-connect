import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { useMemo } from 'react';

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isOwn: boolean;
  isRead: boolean;
  showTimestamp?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isLastOwnMessage?: boolean;
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
}: MessageBubbleProps) {
  const emojiOnly = useMemo(() => isEmojiOnly(content), [content]);
  const longMessage = useMemo(() => isLongMessage(content), [content]);

  // Calculate border radius based on position in group
  const getBorderRadius = () => {
    // Base radius values
    const full = '20px';
    const tight = '6px';
    
    if (isOwn) {
      // Own messages - right aligned, tail on bottom-right
      if (isFirstInGroup && isLastInGroup) {
        // Single message
        return `${full} ${full} ${tight} ${full}`;
      } else if (isFirstInGroup) {
        // First in group
        return `${full} ${full} ${tight} ${full}`;
      } else if (isLastInGroup) {
        // Last in group
        return `${full} ${tight} ${tight} ${full}`;
      } else {
        // Middle
        return `${full} ${tight} ${tight} ${full}`;
      }
    } else {
      // Other user's messages - left aligned, tail on bottom-left
      if (isFirstInGroup && isLastInGroup) {
        // Single message
        return `${full} ${full} ${full} ${tight}`;
      } else if (isFirstInGroup) {
        // First in group
        return `${full} ${full} ${full} ${tight}`;
      } else if (isLastInGroup) {
        // Last in group
        return `${tight} ${full} ${full} ${tight}`;
      } else {
        // Middle
        return `${tight} ${full} ${full} ${tight}`;
      }
    }
  };

  return (
    <div
      className={cn(
        'flex animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
        isOwn ? 'justify-end' : 'justify-start',
        // Tighter spacing for grouped messages
        isLastInGroup ? 'mb-2.5' : 'mb-0.5'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] shadow-sm',
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
        
        {/* Timestamp and read status - only show on last message in group */}
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
            
            {/* Read receipt - only on the last own message */}
            {isOwn && isLastOwnMessage && (
              <CheckCheck 
                className={cn(
                  'w-3.5 h-3.5 transition-colors',
                  isRead 
                    ? 'text-accent-foreground' 
                    : 'text-primary-foreground/50'
                )} 
              />
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
            {isOwn && isLastOwnMessage && (
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
    </div>
  );
}
