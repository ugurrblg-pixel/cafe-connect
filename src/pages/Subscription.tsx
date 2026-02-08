import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Crown, 
  Lock, 
  Eye, 
  MessageCircle, 
  MapPin, 
  Zap, 
  Star, 
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumFeature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: Eye,
    title: 'Profiline Kim Baktı',
    description: 'Profilini görüntüleyen kişileri gör',
  },
  {
    icon: MessageCircle,
    title: 'Sınırsız Mesajlaşma',
    description: 'Mesaj limitleri olmadan sohbet et',
  },
  {
    icon: MapPin,
    title: 'Geniş Kafe Alanı',
    description: 'Daha uzak kafeleri keşfet',
  },
  {
    icon: Zap,
    title: 'Profil Boost',
    description: 'Kafede öne çık, daha fazla görün',
  },
  {
    icon: Star,
    title: 'Öncelikli Görünürlük',
    description: 'Aktif listelerde üst sıralarda yer al',
  },
  {
    icon: Clock,
    title: 'Son Görülme Kontrolü',
    description: 'Son görülmeni gizle, diğerlerini gör',
  },
];

function FeatureCard({ feature }: { feature: PremiumFeature }) {
  const Icon = feature.icon;
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-[15px]">{feature.title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
      </div>

      {/* Lock */}
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        <Lock className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function Subscription() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Premium</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-6">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Crown className="w-7 h-7 text-white" />
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-white">Premium'a Geç</h2>
            
            {/* Subtitle */}
            <p className="text-white/90 mt-2 text-[15px] leading-relaxed max-w-[280px] mx-auto">
              Kafelerde daha görünür ol, daha hızlı bağlantı kur
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-3">
          {PREMIUM_FEATURES.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>

        {/* CTA Section */}
        <div className="space-y-4 pt-2">
          <Button
            disabled
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          >
            <Lock className="w-5 h-5 mr-2" />
            Çok Yakında
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Premium özellikler yakında aktif edilecektir.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="pt-4 pb-2">
          <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
            Şu anda uygulama içinde herhangi bir ödeme veya abonelik bulunmamaktadır.
          </p>
        </div>
      </div>
    </div>
  );
}
