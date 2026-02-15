import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Crown, Lock, Zap, Eye, MessageCircle, Star, Rocket, Sparkles,
  Check, Loader2, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileGateModal } from '@/components/ProfileGateModal';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { usePremiumContext } from '@/contexts/PremiumContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  initializeBilling, isBillingReady, getProducts, purchaseSubscription, restorePurchases,
  BillingProduct, getStoreName, getStoreManagementUrl, detectPlatform,
} from '@/lib/billing/index';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PremiumFeature {
  icon: React.ElementType;
  title: string;
  description: string;
  highlight?: boolean;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  { icon: Zap, title: 'Boost', description: 'Kafelerde en üstte görün', highlight: true },
  { icon: Eye, title: 'Görünürlük', description: 'Daha görünür ol, öne çık', highlight: true },
  { icon: MessageCircle, title: 'Sınırsız Sohbet', description: 'Günlük sohbet limiti olmadan tanış' },
  { icon: Star, title: 'Premium Rozet', description: 'Premium rozeti ile fark edil' },
  { icon: Rocket, title: 'Öncelikli Görünüm', description: 'Algoritma seni öne çıkarır' },
];

const COMPARISON = {
  free: ['Normal görünürlük', 'Standart listeleme', 'Günlük 3 sohbet limiti'],
  premium: ['Boost ile üst sıralarda görün', 'Öne çıkan rozet', 'Kafelerde öncelikli görünüm', 'Sınırsız sohbet', 'Profil görüntüleyenleri gör'],
};

type PurchaseState = 'idle' | 'loading' | 'success' | 'error';

function PlanCard({ product, selected, onSelect }: { product: BillingProduct; selected: boolean; onSelect: () => void }) {
  const isPopular = !!product.badge;
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-4 rounded-2xl border text-left transition-all w-full',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : isPopular
            ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
            : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      {product.badge && (
        <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-2 py-0.5">
          {product.badge}
        </Badge>
      )}
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold text-foreground">{product.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
          {product.perMonthPrice && (
            <p className="text-[11px] text-primary font-medium mt-1">{product.perMonthPrice}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-foreground text-lg">{product.price}</p>
        </div>
      </div>
    </button>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  const { isPremium, subscription, refreshSubscription } = usePremiumContext();
  const { user } = useAuth();
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [billingReady, setBillingReady] = useState(false);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Initialize native billing SDK first
      await initializeBilling();
      const ready = await isBillingReady();
      setBillingReady(ready);
      const prods = await getProducts();
      setProducts(prods);
      // Default select the popular plan
      const popular = prods.find(p => p.badge);
      setSelectedProduct(popular?.productId || prods[0]?.productId || null);
    }
    init();
  }, []);

  const handlePurchase = async () => {
    if (!isProfileComplete) { setShowProfileGate(true); return; }
    if (!user || !selectedProduct) return;
    setPurchaseState('loading');
    setPurchaseError(null);
    const result = await purchaseSubscription(selectedProduct, user.id);
    if (result.success) {
      setPurchaseState('success');
      await refreshSubscription();
      toast.success('Premium aktif edildi! 🎉');
    } else {
      setPurchaseState('error');
      setPurchaseError(result.error || 'Satın alma başarısız oldu');
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    setRestoring(true);
    const result = await restorePurchases(user.id);
    if (result.success) { await refreshSubscription(); toast.success('Abonelik geri yüklendi!'); }
    else { toast.error(result.error || 'Geri yükleme başarısız'); }
    setRestoring(false);
  };

  // Already premium view
  if (isPremium && subscription) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Premium</h1>
          </div>
        </div>
        <div className="px-4 py-6 max-w-md mx-auto space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Premium Aktif</h2>
              <p className="text-white/90 mt-2 text-sm">Tüm premium özelliklerden yararlanıyorsun!</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium text-foreground capitalize">{subscription.plan_type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Durum</span>
              <span className="font-medium text-accent">Aktif</span>
            </div>
            {subscription.expires_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bitiş tarihi</span>
                <span className="font-medium text-foreground">{new Date(subscription.expires_at).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Aboneliğini yönetmek için {getStoreName()} &gt; Abonelikler bölümünü kullan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Premium</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Daha görünür ol</h2>
            <p className="text-white/90 mt-2 text-[15px] max-w-[280px] mx-auto">
              Kafelerde öne çık, daha çok kişiyle tanış
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">Premium üyelere özel avantajlar</span>
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Plan Seç</h3>
          <div className="grid gap-3">
            {products.map((product) => (
              <PlanCard
                key={product.productId}
                product={product}
                selected={selectedProduct === product.productId}
                onSelect={() => setSelectedProduct(product.productId)}
              />
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Premium Özellikleri
          </h3>
          <div className="grid gap-3">
            {PREMIUM_FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className={cn(
                  'p-4 rounded-2xl border transition-all',
                  feature.highlight
                    ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'
                    : 'bg-card border-border'
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      feature.highlight ? 'bg-primary/20' : 'bg-secondary'
                    )}>
                      <Icon className={cn('w-5 h-5', feature.highlight ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Karşılaştırma</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <h4 className="font-semibold text-muted-foreground mb-3 text-sm">ÜCRETSİZ</h4>
              <ul className="space-y-2">
                {COMPARISON.free.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <h4 className="font-semibold text-primary mb-3 text-sm flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                PREMIUM
              </h4>
              <ul className="space-y-2">
                {COMPARISON.premium.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Purchase Feedback */}
        {purchaseState === 'success' && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
            <p className="text-sm text-accent font-medium">Premium başarıyla aktif edildi!</p>
          </div>
        )}
        {purchaseState === 'error' && purchaseError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">{purchaseError}</p>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handlePurchase}
            disabled={purchaseState === 'loading' || !billingReady}
            className={cn(
              "w-full h-14 rounded-2xl text-lg font-semibold",
              billingReady
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
            )}
          >
            {purchaseState === 'loading' ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />İşleniyor...</>
            ) : (
              <><Lock className="w-5 h-5 mr-2" />Premium'a Geç</>
            )}
          </Button>

          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Satın alımları geri yükle
          </button>

          <button onClick={() => navigate(-1)} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Daha sonra
          </button>
        </div>

        {/* Disclaimer */}
        <div className="pt-2 pb-2 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ödemeler {getStoreName()} tarafından işlenir</span>
          </div>
          {!billingReady && (
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Premium özellikler yakında aktif edilecektir.
              <br />Şu anda uygulama içinde ödeme alınmamaktadır.
            </p>
          )}
        </div>
      </div>

      <ProfileGateModal open={showProfileGate} onOpenChange={setShowProfileGate} action="premium" />
    </div>
  );
}
