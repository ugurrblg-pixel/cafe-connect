import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Crown, 
  MessageCircle, 
  Eye, 
  Clock, 
  Rocket, 
  MapPin,
  TrendingUp,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'chat_limit' | 'profile_views' | 'boost' | 'read_receipts' | 'discovery_radius' | 'general';
}

const TRIGGER_MESSAGES: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
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
    subtitle: 'Premium ile daha fazla kişiye ulaş',
    icon: Rocket,
  },
  read_receipts: {
    title: 'Mesaj okundu bilgisi',
    subtitle: 'Premium ile mesajlarının okunup okunmadığını gör',
    icon: Clock,
  },
  discovery_radius: {
    title: 'Keşif alanını genişlet',
    subtitle: 'Premium ile 5 km yarıçapında kafeleri keşfet',
    icon: MapPin,
  },
  general: {
    title: 'Premium\'a Geç',
    subtitle: 'Tüm özelliklerin kilidini aç',
    icon: Crown,
  },
};

const QUICK_FEATURES = [
  { icon: MessageCircle, text: 'Sınırsız sohbet' },
  { icon: Eye, text: 'Profil görüntüleyenler' },
  { icon: MapPin, text: '5 km keşif alanı' },
  { icon: Rocket, text: 'Profil boost' },
  { icon: TrendingUp, text: 'Öncelikli görünürlük' },
  { icon: Clock, text: 'Son görülme kontrolü' },
];

export function PaywallModal({ isOpen, onClose, trigger = 'general' }: PaywallModalProps) {
  const navigate = useNavigate();
  const message = TRIGGER_MESSAGES[trigger];
  const TriggerIcon = message.icon;

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
        <div className="bg-gradient-to-br from-amber-500/90 via-orange-500/80 to-primary/70 pt-10 pb-8 px-6 text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <TriggerIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">{message.title}</h2>
          <p className="text-white/80 mt-2">{message.subtitle}</p>
        </div>

        {/* Features grid */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_FEATURES.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing preview */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Aylık</div>
              <div className="text-lg font-bold text-foreground">₺49,99</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Yıllık</div>
              <div className="text-lg font-bold text-primary">₺29,99<span className="text-sm font-normal">/ay</span></div>
              <div className="text-xs text-accent font-medium">%40 tasarruf</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 pt-4 safe-bottom space-y-3">
          <Button
            onClick={handleViewPlans}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Planları İncele
          </Button>
          
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Şimdilik değil
          </button>

          {/* Disclaimer */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Premium yakında aktif edilecek
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
