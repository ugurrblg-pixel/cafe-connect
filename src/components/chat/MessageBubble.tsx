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
}

export function MessageBubble({
  content,
  timestamp,
  isOwn,
  isRead,
  showTimestamp = true,
  isFirstInGroup = true,
  isLastInGroup = true,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex',
        isOwn ? 'justify-end' : 'justify-start',
        !isLastInGroup && 'mb-0.5',
        isLastInGroup && 'mb-3'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 transition-all',
          // Bubble colors - calmer palette
          isOwn
            ? 'bg-primary/90 text-primary-foreground'
            : 'bg-secondary text-secondary-foreground',
          // Bubble shape based on position in group - softer corners
          isOwn && isFirstInGroup && isLastInGroup && 'rounded-[20px] rounded-br-lg',
          isOwn && isFirstInGroup && !isLastInGroup && 'rounded-[20px] rounded-br-lg',
          isOwn && !isFirstInGroup && isLastInGroup && 'rounded-[20px] rounded-br-lg rounded-tr-lg',
          isOwn && !isFirstInGroup && !isLastInGroup && 'rounded-[18px] rounded-r-lg',
          !isOwn && isFirstInGroup && isLastInGroup && 'rounded-[20px] rounded-bl-lg',
          !isOwn && isFirstInGroup && !isLastInGroup && 'rounded-[20px] rounded-bl-lg',
          !isOwn && !isFirstInGroup && isLastInGroup && 'rounded-[20px] rounded-bl-lg rounded-tl-lg',
          !isOwn && !isFirstInGroup && !isLastInGroup && 'rounded-[18px] rounded-l-lg'
        )}
      >
        {/* Message content with better typography */}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
        
        {/* Timestamp and read status - more subtle */}
        {showTimestamp && isLastInGroup && (
          <div className={cn(
            'flex items-center gap-1.5 mt-1.5',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[11px] font-medium',
              isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground/70'
            )}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {isOwn && (
              isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/50" />
              ) : (
                <Check className="w-3.5 h-3.5 text-primary-foreground/50" />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
