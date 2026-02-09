import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountDialog({ open, onOpenChange, onConfirm }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === 'SİL';

  const handleConfirm = async () => {
    if (!canDelete) return;
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    setConfirmText('');
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!deleting) { onOpenChange(v); setConfirmText(''); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hesabınızı silmek istediğinize emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">Bu işlem geri alınamaz. Profiliniz, sohbetleriniz ve eşleşmeleriniz kalıcı olarak silinecektir.</span>
            <span className="block font-medium text-foreground mt-3">
              Onaylamak için aşağıya <span className="text-destructive font-bold">SİL</span> yazın:
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="SİL"
          className="mt-2"
          disabled={deleting}
        />

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canDelete || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Siliniyor...</>
            ) : (
              'Hesabı Sil'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
