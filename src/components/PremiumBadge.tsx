import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function PremiumBadge({ className, size = 'md', showText = false }: PremiumBadgeProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (showText) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
        'border border-amber-500/30',
        className
      )}>
        <Crown className={cn(sizes[size], 'text-amber-500')} />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Premium
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center justify-center rounded-full',
      'bg-gradient-to-br from-amber-400 to-orange-500',
      'shadow-lg shadow-amber-500/30',
      containerSizes[size],
      className
    )}>
      <Crown className={cn(sizes[size], 'text-white')} />
    </div>
  );
}
