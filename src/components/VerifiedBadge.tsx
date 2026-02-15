import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function VerifiedBadge({ className, size = 'md', showText = false }: VerifiedBadgeProps) {
  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (showText) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-sky-500/10 border border-sky-500/20',
        className
      )}>
        <BadgeCheck className={cn(sizes[size], 'text-sky-500')} />
        <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
          Doğrulanmış
        </span>
      </div>
    );
  }

  return (
    <BadgeCheck className={cn(sizes[size], 'text-sky-500', className)} />
  );
}
