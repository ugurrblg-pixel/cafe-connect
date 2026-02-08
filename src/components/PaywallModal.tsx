import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Crown, 
  Zap, 
  Eye, 
  MessageCircle,
  Star,
  Lock,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'chat_limit' | 'profile_views' | 'boost' | 'read_receipts' | 'discovery_radius' | 'general';
}

const TRIGGER_CONFIG: Record<string, { 
  title: string; 
  subtitle: string; 
  icon: React.ElementType;
}> = {
  chat_limit: {
    title: 'Günlük sohbet limitine ulaştın',
    subtitle: 'Premium ile sınırsız sohbet başlat',
    icon: MessageCircle,
  },
  profile_views: {
    title: 'Profilini kim görüntüledi?',
    subtitle: 'Premium ile tüm ziyaretçilerini gör',
    icon: Eye,
  },
  boost: {
    title: 'Profilini öne çıkar',
    subtitle: 'Premium ile kafelerde görünür ol',
    icon: Zap,
  },
  read_receipts: {
    title: 'Mesaj okundu bilgisi',
    subtitle: 'Premium ile mesajlarının okunup okunmadığını gör',
    icon: MessageCircle,
  },
  discovery_radius: {
    title: 'Keşif alanını genişlet',
    subtitle: 'Premium ile daha uzak kafeleri keşfet',
    icon: Star,
  },
  general: {
    title: 'Premium ile fark edil',
    subtitle: 'Kafelerde öne çık, daha çok tanış',
    icon: Crown,
  },
};

const COMPARISON = {
  free: [
    'Normal görünürlük',
    'Standart listeleme',
  ],
  premium: [
    'Boost',
    'Öne çıkan rozet',
    'Kafelerde üst sıralar',
    'Daha fazla görünürlük',
  ],
};

export function PaywallModal({ isOpen, onClose, trigger = 'general' }: PaywallModalProps) {
  const navigate = useNavigate();
  const config = TRIGGER_CONFIG[trigger];
  const TriggerIcon = config.icon;

  const handleViewPlans = () => {
    onClose();
    navigate('/subscription');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-colors z-10"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 pt-10 pb-8 px-6 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <TriggerIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-white/80 mt-2">{config.subtitle}</p>
        </div>

        {/* Comparison */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {/* Free */}
            <div className="p-3 rounded-xl bg-secondary/50 border border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">ÜCRETSİZ</h4>
              <ul className="space-y-1.5">
                {COMPARISON.free.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <h4 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                PREMIUM
              </h4>
              <ul className="space-y-1.5">
                {COMPARISON.premium.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                    <Check className="w-3 h-3 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 pt-2 safe-bottom space-y-3">
          <Button
            onClick={handleViewPlans}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            <Crown className="w-5 h-5 mr-2" />
            Premium'a Geç
          </Button>
          
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Daha sonra
          </button>

          {/* Disclaimer */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Ödeme sistemi yakında aktif edilecek
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
