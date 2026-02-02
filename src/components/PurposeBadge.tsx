import { Purpose } from '@/types';
import { cn } from '@/lib/utils';
import { MessageCircle, Users, Heart } from 'lucide-react';

interface PurposeBadgeProps {
  purpose: Purpose;
  size?: 'sm' | 'md';
  className?: string;
}

const purposeConfig = {
  chat: {
    label: 'Chat',
    icon: MessageCircle,
    className: 'badge-chat',
  },
  friendship: {
    label: 'Friendship',
    icon: Users,
    className: 'badge-friendship',
  },
  dating: {
    label: 'Dating',
    icon: Heart,
    className: 'badge-dating',
  },
};

export function PurposeBadge({ purpose, size = 'md', className }: PurposeBadgeProps) {
  const config = purposeConfig[purpose];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}
