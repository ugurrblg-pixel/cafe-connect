import { MessageCircle, Crown } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';

interface ChatLimitIndicatorProps {
  className?: string;
  onUpgradeClick?: () => void;
}

export function ChatLimitIndicator({ className, onUpgradeClick }: ChatLimitIndicatorProps) {
  const { isPremium, remainingChats, FREE_CHAT_LIMIT, loading } = usePremium();

  if (loading) return null;

  if (isPremium) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
        'border border-amber-500/30',
        className
      )}>
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Sınırsız
        </span>
      </div>
    );
  }

  const isLow = remainingChats <= 1;
  const isEmpty = remainingChats === 0;

  return (
    <button
      onClick={onUpgradeClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
        isEmpty
          ? 'bg-destructive/10 border border-destructive/30'
          : isLow
            ? 'bg-warning/10 border border-warning/30'
            : 'bg-secondary border border-border',
        className
      )}
    >
      <MessageCircle className={cn(
        'w-4 h-4',
        isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-muted-foreground'
      )} />
      <span className={cn(
        'text-xs font-medium',
        isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-muted-foreground'
      )}>
        {remainingChats}/{FREE_CHAT_LIMIT}
      </span>
    </button>
  );
}
