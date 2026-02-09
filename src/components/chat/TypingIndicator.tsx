import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div 
      className={cn(
        'flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        className
      )}
    >
      <div className="bg-secondary/80 rounded-2xl rounded-bl-md px-5 py-3.5 min-h-[44px] shadow-sm">
        <div className="flex items-center gap-1.5">
          {/* Bouncing dots for more lively feel */}
          <span 
            className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" 
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span 
            className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" 
            style={{ animationDelay: '200ms', animationDuration: '1s' }}
          />
          <span 
            className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" 
            style={{ animationDelay: '400ms', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  );
}
