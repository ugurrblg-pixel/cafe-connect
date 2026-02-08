import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewMessagesButtonProps {
  visible: boolean;
  onClick: () => void;
  label: string;
}

export function NewMessagesButton({ visible, onClick, label }: NewMessagesButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-40',
        'flex items-center gap-1.5 px-4 py-2 rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'text-sm font-medium',
        'transition-all duration-300 ease-out',
        visible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      )}
    >
      <ChevronDown className="w-4 h-4" />
      {label}
    </button>
  );
}
