import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { UserMinus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onUnmatch: () => void;
}

export function MatchActionSheet({
  open,
  onOpenChange,
  userName,
  onUnmatch,
}: MatchActionSheetProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleUnmatchClick = () => {
    // Close the drawer first, then show confirmation
    onOpenChange(false);
    // Small delay to prevent visual glitch
    setTimeout(() => setShowConfirmation(true), 150);
  };

  const handleConfirmUnmatch = () => {
    onUnmatch();
    setShowConfirmation(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-8">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base font-medium text-muted-foreground">
              {userName}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 space-y-2">
            {/* Unmatch Action */}
            <button
              onClick={handleUnmatchClick}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl',
                'bg-destructive/10 hover:bg-destructive/15 active:bg-destructive/20',
                'transition-colors'
              )}
            >
              <UserMinus className="w-5 h-5 text-destructive" />
              <span className="text-destructive font-medium">Eşleşmeyi Kaldır</span>
            </button>

            {/* Cancel Action */}
            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl',
                'bg-secondary hover:bg-secondary/80 active:bg-secondary/60',
                'transition-colors'
              )}
            >
              <X className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Vazgeç</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Eşleşme kaldırılsın mı?"
        description="Bu kişiyle olan sohbet de silinecek. Bu işlem geri alınamaz."
        confirmText="Eşleşmeyi Kaldır"
        onConfirm={handleConfirmUnmatch}
      />
    </>
  );
}
