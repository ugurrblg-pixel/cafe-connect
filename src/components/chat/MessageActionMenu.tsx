import { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

interface MessageActionMenuProps {
  content: string;
  isOwn: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}

export function MessageActionMenu({ 
  content, 
  isOwn, 
  onDelete, 
  children 
}: MessageActionMenuProps) {
  const { locale } = useI18n();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const copyText = locale === 'tr' ? 'Kopyala' : 'Copy';
  const deleteText = locale === 'tr' ? 'Sil' : 'Delete';
  const copiedText = locale === 'tr' ? 'Kopyalandı' : 'Copied';

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 1000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setShowMenu(false);
  };

  // Long press handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowMenu(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Context menu for desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  return (
    <div 
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={handleContextMenu}
    >
      {children}
      
      {/* Action menu overlay */}
      {showMenu && (
        <div 
          className={cn(
            "fixed z-[100] min-w-[140px] py-1.5 rounded-xl bg-popover border border-border shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          style={{
            top: menuPosition ? Math.min(menuPosition.y, window.innerHeight - 100) : '50%',
            left: menuPosition 
              ? isOwn 
                ? Math.max(menuPosition.x - 140, 8) 
                : Math.min(menuPosition.x, window.innerWidth - 148)
              : '50%',
          }}
        >
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors"
          >
          {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">{copiedText}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span>{copyText}</span>
              </>
            )}
          </button>
          
          {isOwn && onDelete && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleteText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
