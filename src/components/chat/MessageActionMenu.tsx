import { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, Check, MoreHorizontal } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  AlertDialog,
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
  onDeleteForEveryone?: () => Promise<boolean>;
  children: React.ReactNode;
}

export function MessageActionMenu({ 
  content, 
  isOwn, 
  messageTimestamp,
  onDeleteForEveryone,
  children 
}: MessageActionMenuProps) {
  const { locale } = useI18n();
  const [showSheet, setShowSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteBusy = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Text translations
  const texts = {
    copy: locale === 'tr' ? 'Kopyala' : 'Copy',
    delete: locale === 'tr' ? 'Sil' : 'Delete',
    copied: locale === 'tr' ? 'Kopyalandı' : 'Copied',
    messageOptions: locale === 'tr' ? 'Mesaj Seçenekleri' : 'Message Options',
    deleteMessage: locale === 'tr' ? 'Mesajı Sil' : 'Delete Message',
    deleteForEveryone: locale === 'tr' ? 'Herkes için sil' : 'Delete for everyone',
    deleteForEveryoneDesc: locale === 'tr' 
      ? 'Bu mesaj herkes için silinecek ve "Bu mesaj silindi" olarak görünecek.'
      : 'This message will be deleted for everyone and will show as "This message was deleted".',
    cancel: locale === 'tr' ? 'İptal' : 'Cancel',
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
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
    setDeleteError('');
    setShowSheet(false);
    // Small delay to let sheet close before opening dialog
    confirmTimer.current = setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 150);
  };

  const handleDeleteForEveryone = async () => {
    if (!isOwn || !onDeleteForEveryone || deleteBusy.current) return;
    deleteBusy.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      if (await onDeleteForEveryone()) setShowDeleteConfirm(false);
      else setDeleteError(locale === 'tr' ? 'Mesaj kaldırılamadı. Yeniden deneyebilirsin.' : 'Message could not be removed. Try again.');
    } catch {
      setDeleteError(locale === 'tr' ? 'Mesaj kaldırılamadı. Yeniden deneyebilirsin.' : 'Message could not be removed. Try again.');
    } finally { deleteBusy.current = false; setDeleting(false); }
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
        <Button ref={optionsRef} type="button" variant="ghost" size="icon" className="ml-auto h-6 w-8 text-muted-foreground" aria-label={texts.messageOptions} onClick={()=>setShowSheet(true)}><MoreHorizontal className="h-4 w-4"/></Button>
      </div>

      {/* Bottom Sheet for Actions */}
      <Drawer autoFocus open={showSheet} onOpenChange={setShowSheet}>
        <DrawerContent className="max-h-[50vh]" onCloseAutoFocus={event=>{event.preventDefault();optionsRef.current?.focus();}}>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base">{texts.messageOptions}</DrawerTitle>
            <DrawerDescription className="sr-only">{locale === 'tr' ? 'Mesajı kopyalayabilir veya kendi mesajını iki taraftan kaldırabilirsin.' : 'Copy a message or remove your own message for everyone.'}</DrawerDescription>
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
            {isOwn && onDeleteForEveryone && (
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
            <Button variant="outline" className="w-full" onClick={()=>setShowSheet(false)}>{texts.cancel}</Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={open => { if (!deleteBusy.current) { setShowDeleteConfirm(open); setDeleteError('' ); } }}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl" onCloseAutoFocus={event=>{event.preventDefault();optionsRef.current?.focus();}}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">{texts.deleteMessage}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {texts.deleteForEveryoneDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-2">


            {/* The server authorizes removal of the caller's own message. */}
            <button
              onClick={handleDeleteForEveryone}
              disabled={deleting || !isOwn || !onDeleteForEveryone}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors",
                !deleting
                  ? "bg-destructive/10 hover:bg-destructive/20"
                  : "bg-muted opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium",
                  !deleting ? "text-destructive" : "text-muted-foreground"
                )}>
                  {deleting ? (locale === 'tr' ? 'Kaldırılıyor…' : 'Removing…') : texts.deleteForEveryone}
                </span>
              </div>
              
            </button>
          </div>

          <AlertDialogFooter className="sm:justify-center">
            {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
            <AlertDialogCancel disabled={deleting} className="w-full rounded-xl">{texts.cancel}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
