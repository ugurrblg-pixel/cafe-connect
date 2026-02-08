import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Crown, 
  Lock, 
  Zap, 
  Eye, 
  MessageCircle, 
  Star, 
  Rocket,
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumFeature {
  icon: React.ElementType;
  title: string;
  description: string;
  highlight?: boolean;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: Zap,
    title: 'Boost',
    description: 'Kafelerde en üstte görün',
    highlight: true,
  },
  {
    icon: Eye,
    title: 'Görünürlük',
    description: 'Daha fazla profile gösteril',
    highlight: true,
  },
  {
    icon: MessageCircle,
    title: 'Öncelikli sohbet',
    description: 'Mesajların daha hızlı fark edilir',
  },
  {
    icon: Star,
    title: 'Öne çıkan rozet',
    description: 'Premium rozeti ile fark edil',
  },
  {
    icon: Rocket,
    title: 'Daha fazla eşleşme',
    description: 'Algoritma seni öne çıkarır',
  },
];

const COMPARISON = {
  free: [
    'Normal görünürlük',
    'Standart listeleme',
    'Günlük 3 sohbet limiti',
  ],
  premium: [
    'Boost ile üst sıralarda görün',
    'Öne çıkan rozet',
    'Kafelerde öncelikli görünüm',
    'Sınırsız sohbet',
    'Profil görüntüleyenleri gör',
  ],
};

function FeatureCard({ feature }: { feature: PremiumFeature }) {
  const Icon = feature.icon;
  
  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      feature.highlight 
        ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' 
        : 'bg-card border-border'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          feature.highlight ? 'bg-primary/20' : 'bg-secondary'
        }`}>
          <Icon className={`w-5 h-5 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{feature.title}</h4>
          <p className="text-sm text-muted-foreground">{feature.description}</p>
        </div>
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-6">
          {/* Animated glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white">Premium ile daha görünür ol</h2>
            <p className="text-white/90 mt-2 text-[15px] max-w-[280px] mx-auto">
              Kafelerde öne çık, daha çok kişiyle tanış
            </p>

            <div className="flex items-center justify-center gap-2 mt-4">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">Premium üyelere özel özellikler</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Premium Özellikleri
          </h3>
          <div className="grid gap-3">
            {PREMIUM_FEATURES.map((feature, index) => (
              <FeatureCard key={index} feature={feature} />
            ))}
          </div>
        </div>

        {/* Comparison Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Karşılaştırma</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Free column */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <h4 className="font-semibold text-muted-foreground mb-3 text-sm">ÜCRETSİZ</h4>
              <ul className="space-y-2">
                {COMPARISON.free.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium column */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <h4 className="font-semibold text-primary mb-3 text-sm flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                PREMIUM
              </h4>
              <ul className="space-y-2">
                {COMPARISON.premium.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="space-y-4 pt-2">
          <Button
            disabled
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          >
            <Lock className="w-5 h-5 mr-2" />
            Premium'a Geç
          </Button>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Daha sonra
          </button>
        </div>

        {/* Disclaimer */}
        <div className="pt-2 pb-2 text-center">
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Premium özellikler yakında aktif edilecektir.
            <br />
            Şu anda uygulama içinde ödeme alınmamaktadır.
          </p>
        </div>
      </div>
    </div>
  );
}
