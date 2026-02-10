import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, MessageCircle, MapPin, Crown, Sparkles, ChevronRight } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { cn } from '@/lib/utils';

export type GatedAction = 'message' | 'check-in' | 'visibility' | 'premium';

interface ProfileGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: GatedAction;
}

const ACTION_CONFIG: Record<GatedAction, {
  icon: typeof MessageCircle;
  title: string;
  description: string;
  benefit: string;
}> = {
  message: {
    icon: MessageCircle,
    title: 'Mesaj göndermek için profilini tamamla',
    description: 'İnsanlar kiminle sohbet ettiğini bilmek ister.',
    benefit: 'Tamamlanmış profille daha fazla yanıt al',
  },
  'check-in': {
    icon: MapPin,
    title: 'Check-in yapmak için profilini tamamla',
    description: 'Kafedeki diğer kişilerin seni tanımasını sağla.',
    benefit: 'Yakındaki kişilere görünür ol',
  },
  visibility: {
    icon: User,
    title: 'Görünür olmak için profilini tamamla',
    description: 'Başkalarının seni görebilmesi için profilin tamamlanmış olmalı.',
    benefit: 'Kafe kullanıcı listelerinde görün',
  },
  premium: {
    icon: Crown,
    title: 'Önce profilini tamamla',
    description: 'Premium\'a geçmeden önce profilini oluştur.',
    benefit: 'Premium, tamamlanmış profille daha iyi çalışır',
  },
};

export function ProfileGateModal({ open, onOpenChange, action }: ProfileGateModalProps) {
  const navigate = useNavigate();
  const { percentage, missingFields } = useProfileCompletion();
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const handleCompleteProfile = () => {
    onOpenChange(false);
    navigate('/profile/edit');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          {/* Icon */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Progress */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Profil tamamlama durumu</span>
              <span className="text-sm font-semibold text-primary">%{percentage}</span>
            </div>
            <Progress value={percentage} className="h-2 mb-3" />
            
            {/* Missing fields */}
            {missingFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {missingFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-1 text-xs rounded-full bg-background border border-border text-muted-foreground"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Benefit */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-foreground">{config.benefit}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleCompleteProfile} className="h-12 rounded-xl">
            Profil Tamamlama
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Şimdilik geç
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
