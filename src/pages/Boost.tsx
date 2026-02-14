import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Zap, ArrowUp, Eye, Clock, Lock, Sparkles, Users, Crown, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePremiumContext } from '@/contexts/PremiumContext';
import { BOOST_PACKAGES, PREMIUM_BOOST_BONUS_MINUTES, BoostPackage, getStoreName } from '@/lib/billing';
import { cn } from '@/lib/utils';

const BOOST_BENEFITS = [
  { icon: ArrowUp, text: 'Kafede üst sıralarda görünürsün' },
  { icon: Eye, text: 'Daha fazla profil ziyareti alırsın' },
  { icon: Users, text: 'Daha görünür ol, daha çok tanış' },
];

const BOOST_DURATION_MINUTES = 30;

function BoostPackageCard({ 
  pkg, selected, onSelect, isPremium 
}: { 
  pkg: BoostPackage; selected: boolean; onSelect: () => void; isPremium: boolean;
}) {
  const isBestValue = pkg.count === 10;
  const displayPrice = isPremium ? pkg.premiumPrice : pkg.price;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-4 rounded-2xl border text-left transition-all w-full',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : isBestValue
            ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
            : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      {isBestValue && (
        <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-2 py-0.5">
          En Avantajlı
        </Badge>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{pkg.count}x Boost</p>
            <p className="text-[11px] text-muted-foreground">
              Birim: {pkg.unitPrice}
            </p>
          </div>
        </div>
        <div className="text-right">
          {isPremium && (
            <p className="text-[11px] text-muted-foreground line-through">{pkg.price}</p>
          )}
          <p className="font-bold text-foreground text-lg">{displayPrice}</p>
        </div>
      </div>
    </button>
  );
}

export default function Boost() {
  const navigate = useNavigate();
  const { isPremium } = usePremiumContext();
  const [isBoostActive] = useState(false);
  const [remainingMinutes] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<string>(BOOST_PACKAGES[0].productId);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Boost</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Zap className="w-8 h-8 text-white fill-white" style={{ animation: 'boostPulse 2s ease-in-out infinite' }} />
            </div>
            <h2 className="text-2xl font-bold text-white">Öne Çık</h2>
            <p className="text-white/90 mt-1 text-[15px]">Kafede daha görünür ol</p>
          </div>
        </div>

        {/* Timer Card */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <div className="relative bg-card p-6 text-center">
            <div className="relative w-36 h-36 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-muted" />
              <div className="absolute inset-3 rounded-full bg-secondary/50 flex flex-col items-center justify-center">
                {isBoostActive ? (
                  <>
                    <Zap className="w-6 h-6 text-primary mb-1 fill-primary" />
                    <span className="text-2xl font-bold text-primary">{remainingMinutes}:00</span>
                    <span className="text-xs text-muted-foreground">kalan</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground/50">00:00</span>
                )}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary mb-4">
              <div className={cn('w-2 h-2 rounded-full', isBoostActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50')} />
              <span className="text-sm font-medium text-muted-foreground">
                {isBoostActive ? 'Boost Aktif' : 'Boost Aktif Değil'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
              Boost ile {BOOST_DURATION_MINUTES} dakika boyunca öne çık.
              {isPremium && <span className="block mt-1 text-primary font-medium">Premium: toplam {BOOST_DURATION_MINUTES + PREMIUM_BOOST_BONUS_MINUTES} dakika</span>}
            </p>
          </div>
        </div>

        {/* Premium Advantage Banner */}
        {isPremium && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-foreground text-sm">Premium Avantajların</span>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                Tüm Boost paketlerinde %20 indirim
              </li>
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                Her Boost {BOOST_DURATION_MINUTES + PREMIUM_BOOST_BONUS_MINUTES} dk ({BOOST_DURATION_MINUTES} dk + {PREMIUM_BOOST_BONUS_MINUTES} dk bonus)
              </li>
            </ul>
          </div>
        )}

        {/* Boost Packages */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Boost Paketi Seç
          </h3>
          <div className="grid gap-3">
            {BOOST_PACKAGES.map((pkg) => (
              <BoostPackageCard
                key={pkg.productId}
                pkg={pkg}
                selected={selectedPackage === pkg.productId}
                onSelect={() => setSelectedPackage(pkg.productId)}
                isPremium={isPremium}
              />
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Boost Ne Sağlar?
          </h3>
          <div className="space-y-2">
            {BOOST_BENEFITS.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-foreground font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Info */}
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-secondary/50">
          <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Her Boost {BOOST_DURATION_MINUTES} dakika sürer.
            {isPremium && <span className="text-primary font-medium"> Premium üye olarak +{PREMIUM_BOOST_BONUS_MINUTES} dk bonus ile toplam {BOOST_DURATION_MINUTES + PREMIUM_BOOST_BONUS_MINUTES} dakika!</span>}
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-2">
          <Button
            disabled
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-70"
          >
            <Lock className="w-5 h-5 mr-2" />
            Boost Yakında
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Boost özelliği çok yakında aktif edilecektir.
          </p>
        </div>

        {/* Info */}
        <div className="pt-2 pb-2">
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-secondary/50">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Boost süresince sadece bulunduğun kafe için geçerlidir. Ödemeler {getStoreName()} üzerinden işlenir.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes boostPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
