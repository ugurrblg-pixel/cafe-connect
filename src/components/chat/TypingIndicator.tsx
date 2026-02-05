import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userName: string;
  className?: string;
}

export function TypingIndicator({ userName, className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-2', className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
      </div>
      <span className="text-sm text-muted-foreground">{userName} yazıyor...</span>
    </div>
  );
}
