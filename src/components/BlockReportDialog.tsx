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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: () => void;
}

export function BlockDialog({ open, onOpenChange, userName, onConfirm }: BlockDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{userName} engellensin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu kullanıcı size mesaj gönderemez, wave atamaz ve kafelerde sizi göremez. 
            Mevcut sohbetleriniz kapatılacaktır. Engeli daha sonra kaldırabilirsiniz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Engelle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type ReportReason = 'spam' | 'harassment' | 'inappropriate';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: (reason: ReportReason, description?: string) => void;
}

const reportReasons: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Reklam veya istenmeyen mesajlar' },
  { value: 'harassment', label: 'Taciz', description: 'Rahatsız edici veya tehdit içeren davranış' },
  { value: 'inappropriate', label: 'Uygunsuz Davranış', description: 'Topluluk kurallarını ihlal eden içerik' },
];

export function ReportDialog({ open, onOpenChange, userName, onConfirm }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');

  const handleConfirm = () => {
    onConfirm(reason, description.trim() || undefined);
    setReason('spam');
    setDescription('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{userName} şikayet edilsin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu, güvenlik ekibimize inceleme için bir rapor gönderecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Şikayet Sebebi</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              {reportReasons.map((r) => (
                <div key={r.value} className="flex items-start space-x-3 py-2">
                  <RadioGroupItem value={r.value} id={r.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={r.value} className="font-medium cursor-pointer">
                      {r.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium mb-2 block">
              Ek Açıklama (Opsiyonel)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detay eklemek isterseniz..."
              className="resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Şikayet Et
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
