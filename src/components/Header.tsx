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
        transparent ? 'bg-transparent' : 'glass-effect border-b border-border',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <h1 className="font-semibold text-lg text-foreground">{title}</h1>

        {showMenu ? (
          <button
            onClick={onMenuClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}
