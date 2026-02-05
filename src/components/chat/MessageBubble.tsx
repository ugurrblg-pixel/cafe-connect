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
        isLastInGroup && 'mb-2'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] px-4 py-2',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground',
          // Bubble shape based on position in group
          isOwn && isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-br-md',
          isOwn && isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-br-md rounded-tr-2xl',
          isOwn && !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-br-md rounded-tr-md',
          isOwn && !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-r-md',
          !isOwn && isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-bl-md',
          !isOwn && isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-bl-md rounded-tl-2xl',
          !isOwn && !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-bl-md rounded-tl-md',
          !isOwn && !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-l-md'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        
        {showTimestamp && isLastInGroup && (
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
            
            {isOwn && (
              isRead ? (
                <CheckCheck className={cn(
                  'w-3.5 h-3.5',
                  'text-primary-foreground/60'
                )} />
              ) : (
                <Check className={cn(
                  'w-3.5 h-3.5',
                  'text-primary-foreground/60'
                )} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
