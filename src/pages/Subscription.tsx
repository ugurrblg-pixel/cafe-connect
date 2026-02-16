import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Crown, Lock, Zap, Eye, MessageCircle, Star, Rocket, Sparkles,
  Check, Loader2, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileGateModal } from '@/components/ProfileGateModal';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { usePremiumContext } from '@/contexts/PremiumContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { 
  initializeBilling, isBillingReady, getProducts, purchaseSubscription, restorePurchases,
  BillingProduct, getStoreName, detectPlatform,
} from '@/lib/billing/index';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PremiumFeature {
  icon: React.ElementType;
  titleKey: 'boostTitle' | 'visibilityTitle' | 'unlimitedChatTitle' | 'premiumBadgeTitle' | 'priorityTitle';
  descKey: 'boostDesc' | 'visibilityDesc' | 'unlimitedChatDesc' | 'premiumBadgeDesc' | 'priorityDesc';
  highlight?: boolean;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  { icon: Zap, titleKey: 'boostTitle', descKey: 'boostDesc', highlight: true },
  { icon: Eye, titleKey: 'visibilityTitle', descKey: 'visibilityDesc', highlight: true },
  { icon: MessageCircle, titleKey: 'unlimitedChatTitle', descKey: 'unlimitedChatDesc' },
  { icon: Star, titleKey: 'premiumBadgeTitle', descKey: 'premiumBadgeDesc' },
  { icon: Rocket, titleKey: 'priorityTitle', descKey: 'priorityDesc' },
];

type PurchaseState = 'idle' | 'loading' | 'success' | 'error';

function PlanCard({ product, selected, onSelect }: { product: BillingProduct; selected: boolean; onSelect: () => void }) {
  const isPopular = !!product.badge;
  return (
    <button onClick={onSelect} className={cn(
      'relative p-4 rounded-2xl border text-left transition-all w-full',
      selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : isPopular ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60' : 'border-border bg-card hover:border-muted-foreground/30'
    )}>
      {product.badge && (
        <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-2 py-0.5">{product.badge}</Badge>
      )}
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold text-foreground">{product.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
          {product.perMonthPrice && <p className="text-[11px] text-primary font-medium mt-1">{product.perMonthPrice}</p>}
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
  const { t, formatString } = useI18n();
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
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    const platform = detectPlatform();
    setIsWeb(platform === 'web');

    async function init() {
      await initializeBilling();
      const ready = await isBillingReady();
      setBillingReady(ready);
      const prods = await getProducts();
      setProducts(prods);
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
      toast.success(t.subscription.premiumActivated);
    } else {
      setPurchaseState('error');
      setPurchaseError(result.error || 'Purchase failed');
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    setRestoring(true);
    const result = await restorePurchases(user.id);
    if (result.success) { await refreshSubscription(); toast.success(t.subscription.subscriptionRestored); }
    else { toast.error(result.error || t.subscription.restoreFailed); }
    setRestoring(false);
  };

  const COMPARISON_FREE = [t.subscription.normalVisibility, t.subscription.standardListing, t.subscription.dailyChatLimit];
  const COMPARISON_PREMIUM = [t.subscription.boostTopRank, t.subscription.featuredBadge, t.subscription.priorityInCafes, t.subscription.unlimitedChat, t.subscription.seeProfileViewers];

  // Already premium view
  if (isPremium && subscription) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg font-semibold">{t.subscription.premium}</h1>
          </div>
        </div>
        <div className="px-4 py-6 max-w-md mx-auto space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4"><Crown className="w-8 h-8 text-white" /></div>
              <h2 className="text-2xl font-bold text-white">{t.subscription.premiumActive}</h2>
              <p className="text-white/90 mt-2 text-sm">{t.subscription.allPremiumFeatures}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.subscription.plan}</span><span className="font-medium text-foreground capitalize">{subscription.plan_type}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.subscription.status}</span><span className="font-medium text-accent">{t.subscription.active}</span></div>
            {subscription.expires_at && (
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.subscription.endDate}</span><span className="font-medium text-foreground">{new Date(subscription.expires_at).toLocaleDateString('tr-TR')}</span></div>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {formatString(t.subscription.manageViaStore, { store: getStoreName() })}
          </p>
        </div>
      </div>
    );
  }

  // Web store redirect view
  if (isWeb) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg font-semibold">{t.subscription.premium}</h1>
          </div>
        </div>
        <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4"><Crown className="w-8 h-8 text-white" /></div>
              <h2 className="text-2xl font-bold text-white">{t.subscription.beMoreVisible}</h2>
              <p className="text-white/90 mt-2 text-[15px] max-w-[280px] mx-auto">{t.subscription.standOutMeetMore}</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />{t.subscription.premiumFeatures}
            </h3>
            <div className="grid gap-3">
              {PREMIUM_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className={cn('p-4 rounded-2xl border transition-all', feature.highlight ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' : 'bg-card border-border')}>
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', feature.highlight ? 'bg-primary/20' : 'bg-secondary')}>
                        <Icon className={cn('w-5 h-5', feature.highlight ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{t.subscription[feature.titleKey]}</h4>
                        <p className="text-sm text-muted-foreground">{t.subscription[feature.descKey]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Web store redirect CTA */}
          <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-2">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{t.subscription.webStoreTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.subscription.webStoreDesc}</p>
            <Button className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white" disabled>
              <Crown className="w-5 h-5 mr-2" />{t.subscription.downloadApp}
            </Button>
          </div>

          <button onClick={() => navigate(-1)} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t.subscription.later}
          </button>
        </div>
        <ProfileGateModal open={showProfileGate} onOpenChange={setShowProfileGate} action="premium" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold">{t.subscription.premium}</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4"><Crown className="w-8 h-8 text-white" /></div>
            <h2 className="text-2xl font-bold text-white">{t.subscription.beMoreVisible}</h2>
            <p className="text-white/90 mt-2 text-[15px] max-w-[280px] mx-auto">{t.subscription.standOutMeetMore}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">{t.subscription.exclusiveForPremium}</span>
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">{t.subscription.selectPlan}</h3>
          <div className="grid gap-3">
            {products.map((product) => (
              <PlanCard key={product.productId} product={product} selected={selectedProduct === product.productId} onSelect={() => setSelectedProduct(product.productId)} />
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />{t.subscription.premiumFeatures}
          </h3>
          <div className="grid gap-3">
            {PREMIUM_FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className={cn('p-4 rounded-2xl border transition-all', feature.highlight ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' : 'bg-card border-border')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', feature.highlight ? 'bg-primary/20' : 'bg-secondary')}>
                      <Icon className={cn('w-5 h-5', feature.highlight ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{t.subscription[feature.titleKey]}</h4>
                      <p className="text-sm text-muted-foreground">{t.subscription[feature.descKey]}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">{t.subscription.comparison}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <h4 className="font-semibold text-muted-foreground mb-3 text-sm">{t.subscription.free}</h4>
              <ul className="space-y-2">
                {COMPARISON_FREE.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <h4 className="font-semibold text-primary mb-3 text-sm flex items-center gap-1"><Crown className="w-3.5 h-3.5" />PREMIUM</h4>
              <ul className="space-y-2">
                {COMPARISON_PREMIUM.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />{item}
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
            <p className="text-sm text-accent font-medium">{t.subscription.premiumActivated}</p>
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
          <Button onClick={handlePurchase} disabled={purchaseState === 'loading' || !billingReady} className={cn("w-full h-14 rounded-2xl text-lg font-semibold", billingReady ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white" : "bg-muted text-muted-foreground cursor-not-allowed opacity-70")}>
            {purchaseState === 'loading' ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t.subscription.processing}</>) : (<><Lock className="w-5 h-5 mr-2" />{t.subscription.goPremium}</>)}
          </Button>
          <button onClick={handleRestore} disabled={restoring} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}{t.subscription.restorePurchases}
          </button>
          <button onClick={() => navigate(-1)} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">{t.subscription.later}</button>
        </div>

        {/* Disclaimer */}
        <div className="pt-2 pb-2 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{formatString(t.subscription.paymentsBy, { store: getStoreName() })}</span>
          </div>
          {!billingReady && (
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              {t.subscription.premiumComingSoon}<br />{t.subscription.noPaymentYet}
            </p>
          )}
        </div>
      </div>
      <ProfileGateModal open={showProfileGate} onOpenChange={setShowProfileGate} action="premium" />
    </div>
  );
}
