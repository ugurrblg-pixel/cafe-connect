import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InitialsAvatar({ name, size = 'md', className }: InitialsAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-2xl',
  };

  return (
    <div
      className={cn(
        'rounded-2xl bg-primary flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      <span className="font-bold text-primary-foreground">
        {getInitials(name)}
      </span>
    </div>
  );
}
