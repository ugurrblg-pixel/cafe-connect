import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ userName, className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex justify-start mb-3', className)}>
      <div className="bg-secondary/80 rounded-[20px] rounded-bl-lg px-4 py-3">
        <div className="flex items-center gap-1.5">
          {/* Animated dots */}
          <div className="flex gap-1">
            <span 
              className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '1s' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" 
              style={{ animationDelay: '150ms', animationDuration: '1s' }}
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" 
              style={{ animationDelay: '300ms', animationDuration: '1s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
