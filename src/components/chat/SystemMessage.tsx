import { cn } from '@/lib/utils';
import { Info, UserPlus, Sparkles } from 'lucide-react';

type SystemMessageType = 'info' | 'join' | 'first';

interface SystemMessageProps {
  type?: SystemMessageType;
  children: React.ReactNode;
  className?: string;
}

const iconMap = {
  info: Info,
  join: UserPlus,
  first: Sparkles,
};

export function SystemMessage({ 
  type = 'info', 
  children, 
  className 
}: SystemMessageProps) {
  const Icon = iconMap[type];
  
  return (
    <div 
      className={cn(
        'flex items-center justify-center gap-2 py-3 px-4 mx-auto my-3',
        'max-w-[280px] rounded-full',
        'bg-secondary/60 text-muted-foreground',
        'text-xs font-medium',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}
