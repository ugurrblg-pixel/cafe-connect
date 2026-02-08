import { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, Check, Crown } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MessageActionMenuProps {
  content: string;
  isOwn: boolean;
  messageTimestamp?: Date;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  children: React.ReactNode;
}

// 2 minute limit for "delete for everyone"
const DELETE_FOR_EVERYONE_LIMIT_MS = 2 * 60 * 1000;

export function MessageActionMenu({ 
  content, 
  isOwn, 
  messageTimestamp,
  onDeleteForMe, 
  onDeleteForEveryone,
  children 
}: MessageActionMenuProps) {
  const { locale } = useI18n();
  const { isPremium } = usePremium();
  const [showSheet, setShowSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Text translations
  const texts = {
    copy: locale === 'tr' ? 'Kopyala' : 'Copy',
    delete: locale === 'tr' ? 'Sil' : 'Delete',
    copied: locale === 'tr' ? 'Kopyalandı' : 'Copied',
    messageOptions: locale === 'tr' ? 'Mesaj Seçenekleri' : 'Message Options',
    deleteMessage: locale === 'tr' ? 'Mesajı Sil' : 'Delete Message',
    deleteForMe: locale === 'tr' ? 'Benim için sil' : 'Delete for me',
    deleteForEveryone: locale === 'tr' ? 'Herkes için sil' : 'Delete for everyone',
    deleteForEveryoneDesc: locale === 'tr' 
      ? 'Bu mesaj herkes için silinecek ve "Bu mesaj silindi" olarak görünecek.'
      : 'This message will be deleted for everyone and will show as "This message was deleted".',
    cancel: locale === 'tr' ? 'İptal' : 'Cancel',
    premiumOnly: locale === 'tr' ? 'Premium' : 'Premium',
    timeExpired: locale === 'tr' ? '2 dk geçti' : '2 min passed',
  };

  // Check if within 2-minute delete window
  const canDeleteForEveryone = (): boolean => {
    if (!messageTimestamp || !isOwn) return false;
    const now = new Date();
    const diff = now.getTime() - messageTimestamp.getTime();
    return diff <= DELETE_FOR_EVERYONE_LIMIT_MS;
  };

  const isWithinTimeLimit = canDeleteForEveryone();

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
        setShowSheet(false);
      }, 800);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleDeleteClick = () => {
    setShowSheet(false);
    // Small delay to let sheet close before opening dialog
    setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 150);
  };

  const handleDeleteForMe = () => {
    if (onDeleteForMe) {
      onDeleteForMe();
    }
    setShowDeleteConfirm(false);
  };

  const handleDeleteForEveryone = () => {
    if (onDeleteForEveryone && isPremium && isWithinTimeLimit) {
      onDeleteForEveryone();
    }
    setShowDeleteConfirm(false);
  };

  // Long press handlers for mobile
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowSheet(true);
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
    setShowSheet(true);
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={handleContextMenu}
      >
        {children}
      </div>

      {/* Bottom Sheet for Actions */}
      <Drawer open={showSheet} onOpenChange={setShowSheet}>
        <DrawerContent className="max-h-[50vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base">{texts.messageOptions}</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4 pb-8 space-y-1">
            {/* Copy Option */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary active:bg-secondary/80 transition-colors"
            >
              {copied ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-primary font-medium">{texts.copied}</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{texts.copy}</span>
                </>
              )}
            </button>

            {/* Delete Option - only for own messages */}
            {isOwn && (onDeleteForMe || onDeleteForEveryone) && (
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <span className="text-destructive">{texts.delete}</span>
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">{texts.deleteMessage}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {texts.deleteForEveryoneDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-2">
            {/* Delete for me */}
            <button
              onClick={handleDeleteForMe}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <span className="text-foreground font-medium">{texts.deleteForMe}</span>
            </button>

            {/* Delete for everyone - Premium only, time limited */}
            <button
              onClick={handleDeleteForEveryone}
              disabled={!isPremium || !isWithinTimeLimit}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors",
                isPremium && isWithinTimeLimit
                  ? "bg-destructive/10 hover:bg-destructive/20"
                  : "bg-muted opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium",
                  isPremium && isWithinTimeLimit ? "text-destructive" : "text-muted-foreground"
                )}>
                  {texts.deleteForEveryone}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {!isWithinTimeLimit && isOwn && (
                  <span className="text-xs text-muted-foreground">{texts.timeExpired}</span>
                )}
                {!isPremium && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-medium text-amber-600">{texts.premiumOnly}</span>
                  </div>
                )}
              </div>
            </button>
          </div>

          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel className="w-full rounded-xl">{texts.cancel}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
