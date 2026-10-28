import { cn } from '@/lib/utils';
import { ChevronLeft, MoreVertical, Radar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onMenuClick?: () => void;
  className?: string;
  transparent?: boolean;
  rightAction?: React.ReactNode;
  brand?: boolean;
}

export function Header({
  title,
  showBack = false,
  showMenu = false,
  onMenuClick,
  className,
  transparent = false,
  rightAction,
  brand = false,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      style={{top:'var(--page-top-offset, 0px)'}}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 safe-top',
        transparent
          ? 'bg-transparent'
          : 'backdrop-blur-xl bg-card/90 border-b border-border/70 shadow-sm',
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        {brand ? <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand-soft text-primary"><Radar className="h-5 w-5" aria-hidden="true"/></span><div><p className="font-display text-lg font-bold leading-none tracking-tight">Riyo</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">Sosyal Radar</p></div></div> : showBack ? (
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <h1 className={brand?'sr-only':'font-display text-lg font-bold text-foreground tracking-tight'}>{title}</h1>

        {rightAction || (showMenu ? (
          <button
            aria-label="Menüyü aç"
            disabled={!onMenuClick}
            onClick={onMenuClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-10" />
        ))}
      </div>
    </header>
  );
}
