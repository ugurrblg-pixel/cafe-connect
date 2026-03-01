import { cn } from '@/lib/utils';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onMenuClick?: () => void;
  className?: string;
  transparent?: boolean;
}

export function Header({
  title,
  showBack = false,
  showMenu = false,
  onMenuClick,
  className,
  transparent = false,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 safe-top',
        transparent
          ? 'bg-transparent'
          : 'backdrop-blur-xl bg-background/80 border-b border-border/50',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <h1 className="font-semibold text-[17px] text-foreground tracking-tight">{title}</h1>

        {showMenu ? (
          <button
            onClick={onMenuClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}
