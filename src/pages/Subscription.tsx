import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Crown, 
  Lock, 
  Eye, 
  MessageCircle, 
  MapPin, 
  Rocket, 
  TrendingUp, 
  Clock,
  Sparkles,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/hooks/usePremium';
import { PremiumBadge } from '@/components/PremiumBadge';

interface PremiumFeature {
  icon: React.ElementType;
  title: string;
  description: string;
  freeValue?: string;
  premiumValue: string;
  highlight?: boolean;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: Eye,
    title: 'Profilini kim görüntüledi?',
    description: 'Seni merak edenleri gör, ilk adımı at',
    freeValue: 'Kilitli',
    premiumValue: 'Tüm ziyaretçiler',
    highlight: true,
  },
  {
    icon: MessageCircle,
    title: 'Sınırsız mesajlaşma',
    description: 'Günlük sohbet limiti olmadan bağlantı kur',
    freeValue: '3 sohbet/gün',
    premiumValue: 'Sınırsız',
    highlight: true,
  },
  {
    icon: MapPin,
    title: 'Genişletilmiş keşif alanı',
    description: 'Daha geniş çevrede kafeleri ve insanları keşfet',
    freeValue: '1 km',
    premiumValue: '5 km',
  },
  {
    icon: Rocket,
    title: 'Profil Boost',
    description: 'Kafedeki listede öne çık, daha fazla ilgi gör',
    freeValue: '—',
    premiumValue: '30 dk/gün',
    highlight: true,
  },
  {
    icon: TrendingUp,
    title: 'Öncelikli görünürlük',
    description: 'Kafe listelerinde üst sıralarda görün',
    freeValue: 'Standart',
    premiumValue: 'Öncelikli',
  },
  {
    icon: Clock,
    title: 'Son görülme kontrolleri',
    description: 'Son görülme zamanını gizle, başkalarınınkini gör',
    freeValue: 'Görünür',
    premiumValue: 'Tam kontrol',
  },
];

function FeatureCard({ feature, index }: { feature: PremiumFeature; index: number }) {
  const Icon = feature.icon;
  
  return (
    <div 
      className={`relative p-4 rounded-2xl border transition-all ${
        feature.highlight 
          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' 
          : 'bg-card border-border'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Lock indicator */}
      <div className="absolute top-3 right-3">
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          feature.highlight 
            ? 'bg-primary/20' 
            : 'bg-secondary'
        }`}>
          <Icon className={`w-5 h-5 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{feature.description}</p>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              Ücretsiz: {feature.freeValue}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
              Premium: {feature.premiumValue}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const { isPremium, subscription } = usePremium();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/90 via-orange-500/90 to-primary/90 p-6 text-white">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Cafe Premium</h2>
                <p className="text-white/80 text-sm">Deneyimini bir üst seviyeye taşı</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Özel özellikler</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm">
                <Shield className="w-4 h-4" />
                <span>Güvenli ödeme</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Status (if premium) */}
        {isPremium && subscription && (
          <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-3">
              <PremiumBadge size="lg" />
              <div>
                <p className="font-semibold text-foreground">Premium Aktif ✨</p>
                <p className="text-sm text-muted-foreground">
                  Tüm özelliklerin kilidi açık
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Premium Özellikleri</h3>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              6 özellik
            </span>
          </div>
          
          <div className="space-y-3">
            {PREMIUM_FEATURES.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Planlar</h3>
          
          {/* Yearly Plan */}
          <div className="relative p-4 rounded-2xl border-2 border-primary/30 bg-primary/5">
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              EN POPÜLER
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-foreground">Yıllık Plan</div>
                <div className="text-sm text-muted-foreground">₺359,99/yıl</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">₺29,99</div>
                <div className="text-xs text-muted-foreground">/ay</div>
              </div>
            </div>
            <div className="mt-2 px-2 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium inline-block">
              %40 tasarruf
            </div>
          </div>

          {/* Monthly Plan */}
          <div className="p-4 rounded-2xl border border-border bg-card">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-foreground">Aylık Plan</div>
                <div className="text-sm text-muted-foreground">Her ay yenilenir</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">₺49,99</div>
                <div className="text-xs text-muted-foreground">/ay</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button - Disabled */}
        <div className="space-y-3">
          <Button
            disabled
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-secondary text-muted-foreground cursor-not-allowed"
          >
            <Lock className="w-5 h-5 mr-2" />
            Çok Yakında
          </Button>

          {/* Disclaimer */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              <span className="font-medium text-foreground">ℹ️ Bilgilendirme:</span>{' '}
              Premium özellikler yakında aktif edilecektir. Şu anda uygulama içinde ödeme alınmamaktadır.
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Abonelikler Google Play üzerinden yönetilecektir.
            <br />
            İstediğin zaman iptal edebilirsin.
          </p>
        </div>
      </div>
    </div>
  );
}
