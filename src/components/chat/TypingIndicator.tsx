import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div 
      className={cn(
        'flex justify-start animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
        className
      )}
    >
      <div className="bg-secondary/70 rounded-2xl rounded-bl-md px-4 py-3 min-h-[40px]">
        <div className="flex items-center gap-1">
          {/* Soft pulsing dots */}
          <span 
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse" 
            style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
          />
          <span 
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse" 
            style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
          />
          <span 
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse" 
            style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
          />
        </div>
      </div>
    </div>
  );
}
