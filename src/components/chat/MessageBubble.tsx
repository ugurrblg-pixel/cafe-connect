import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';

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

export function MessageBubble({
  content,
  timestamp,
  isOwn,
  isRead,
  isFirstInGroup = true,
  isLastInGroup = true,
  isLastOwnMessage = false,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isOwn ? 'justify-end' : 'justify-start',
        // Tighter spacing for grouped messages
        isLastInGroup ? 'mb-3' : 'mb-0.5'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] px-4 py-2.5 shadow-sm',
          // Bubble colors - warm palette
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground border border-border/30',
          // Dynamic border radius based on position and ownership
          isOwn && isFirstInGroup && isLastInGroup && 'rounded-[22px] rounded-br-md',
          isOwn && isFirstInGroup && !isLastInGroup && 'rounded-[22px] rounded-br-md rounded-tr-[22px]',
          isOwn && !isFirstInGroup && isLastInGroup && 'rounded-[22px] rounded-br-md rounded-tr-md',
          isOwn && !isFirstInGroup && !isLastInGroup && 'rounded-[18px] rounded-r-md',
          !isOwn && isFirstInGroup && isLastInGroup && 'rounded-[22px] rounded-bl-md',
          !isOwn && isFirstInGroup && !isLastInGroup && 'rounded-[22px] rounded-bl-md rounded-tl-[22px]',
          !isOwn && !isFirstInGroup && isLastInGroup && 'rounded-[22px] rounded-bl-md rounded-tl-md',
          !isOwn && !isFirstInGroup && !isLastInGroup && 'rounded-[18px] rounded-l-md'
        )}
      >
        {/* Message content */}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
        
        {/* Timestamp and read status - only show on last message in group */}
        {isLastInGroup && (
          <div className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px]',
              isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
            )}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {/* Read receipt - only on the last own message */}
            {isOwn && isLastOwnMessage && (
              isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/60" />
              ) : (
                <Check className="w-3.5 h-3.5 text-primary-foreground/60" />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
