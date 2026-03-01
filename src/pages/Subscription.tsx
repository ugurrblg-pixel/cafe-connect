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

interface PremiumFeature {
  icon: React.ElementType;
  titleKey: 'boostTitle' | 'visibilityTitle' | 'unlimitedChatTitle' | 'premiumBadgeTitle' | 'priorityTitle';
  descKey: 'boostDesc' | 'visibilityDesc' | 'unlimitedChatDesc' | 'premiumBadgeDesc' | 'priorityDesc';
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  { icon: Eye, titleKey: 'visibilityTitle', descKey: 'visibilityDesc' },
  { icon: Zap, titleKey: 'boostTitle', descKey: 'boostDesc' },
  { icon: MessageCircle, titleKey: 'unlimitedChatTitle', descKey: 'unlimitedChatDesc' },
  { icon: Star, titleKey: 'premiumBadgeTitle', descKey: 'premiumBadgeDesc' },
  { icon: Rocket, titleKey: 'priorityTitle', descKey: 'priorityDesc' },
];

type PurchaseState = 'idle' | 'loading' | 'success' | 'error';

function PlanCard({ product, selected, onSelect }: { product: BillingProduct; selected: boolean; onSelect: () => void }) {
  const isPopular = !!product.badge;
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative w-full rounded-2xl text-left transition-all duration-200 border-2',
        selected
          ? 'border-primary bg-primary/[0.04]'
          : 'border-transparent bg-card hover:bg-secondary/50',
      )}
      style={{ 
        boxShadow: selected 
          ? '0 0 0 1px hsl(var(--primary) / 0.15), 0 4px 20px -4px hsl(var(--primary) / 0.12)' 
          : '0 1px 8px -2px hsl(18 30% 50% / 0.06)' 
      }}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            {product.badge}
          </span>
        </div>
      )}
      <div className={cn("p-5", isPopular && "pt-5")}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-foreground">{product.title}</p>
            {product.perMonthPrice && (
              <p className="text-xs text-muted-foreground">{product.perMonthPrice}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold text-foreground">{product.price}</p>
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              selected ? "border-primary bg-primary" : "border-muted-foreground/30"
            )}>
              {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
            </div>
          </div>
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

  // ─── Already premium ───
  if (isPremium && subscription) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">Premium</h1>
            <div className="w-9" />
          </div>
        </div>

        <div className="px-5 pt-10 pb-24 max-w-md mx-auto">
          {/* Active Badge */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5">
              <Crown className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{t.subscription.premiumActive}</h2>
            <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed max-w-[260px]">
              {t.subscription.allPremiumFeatures}
            </p>
          </div>

          {/* Subscription Details */}
          <div
            className="rounded-2xl bg-card p-5 space-y-4"
            style={{ boxShadow: '0 2px 16px -2px hsl(18 30% 50% / 0.07)' }}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.subscription.plan}</span>
              <span className="text-sm font-semibold text-foreground capitalize">{subscription.plan_type}</span>
            </div>
            <div className="h-px bg-border/60" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.subscription.status}</span>
              <span className="text-sm font-semibold text-accent">{t.subscription.active}</span>
            </div>
            {subscription.expires_at && (
              <>
                <div className="h-px bg-border/60" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.subscription.endDate}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {new Date(subscription.expires_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            {formatString(t.subscription.manageViaStore, { store: getStoreName() })}
          </p>
        </div>
      </div>
    );
  }

  // ─── Feature list component ───
  const FeatureList = () => (
    <div className="space-y-1">
      {PREMIUM_FEATURES.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div key={index} className="flex items-center gap-4 py-3.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Icon className="w-[18px] h-[18px] text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground leading-tight">
                {t.subscription[feature.titleKey]}
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                {t.subscription[feature.descKey]}
              </p>
            </div>
            <Check className="w-5 h-5 text-accent flex-shrink-0" />
          </div>
        );
      })}
    </div>
  );

  // ─── Web store redirect ───
  if (isWeb) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">Premium</h1>
            <div className="w-9" />
          </div>
        </div>

        <div className="px-5 pt-8 pb-24 max-w-md mx-auto">
          {/* Crown Hero */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5">
              <Crown className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-[26px] font-bold text-foreground tracking-tight leading-tight">
              Upgrade to Premium
            </h2>
            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-[280px]">
              {t.subscription.standOutMeetMore}
            </p>
          </div>

          {/* Features */}
          <div
            className="rounded-2xl bg-card p-5 mb-8"
            style={{ boxShadow: '0 2px 16px -2px hsl(18 30% 50% / 0.07)' }}
          >
            <FeatureList />
          </div>

          {/* Web CTA */}
          <div
            className="rounded-2xl bg-card p-6 text-center mb-6"
            style={{ boxShadow: '0 2px 16px -2px hsl(18 30% 50% / 0.07)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-7 h-7 text-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t.subscription.webStoreTitle}</h3>
            <p className="text-sm text-muted-foreground mb-5">{t.subscription.webStoreDesc}</p>
            <Button
              className="w-full h-14 rounded-2xl text-[17px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled
            >
              <Crown className="w-5 h-5 mr-2" />
              {t.subscription.downloadApp}
            </Button>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 text-[15px] text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {t.subscription.later}
          </button>
        </div>
        <ProfileGateModal open={showProfileGate} onOpenChange={setShowProfileGate} action="premium" />
      </div>
    );
  }

  // ─── Main subscription screen (native) ───
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">Premium</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 pt-8 pb-12 max-w-md mx-auto">
        {/* Crown Hero */}
        <div className="flex flex-col items-center text-center mb-10">
          <div
            className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5"
            style={{ boxShadow: '0 8px 30px -4px hsl(43 96% 56% / 0.2)' }}
          >
            <Crown className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Upgrade to Premium
          </h2>
          <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed max-w-[280px]">
            {t.subscription.standOutMeetMore}
          </p>
        </div>

        {/* Features Card */}
        <div
          className="rounded-2xl bg-card p-5 mb-8"
          style={{ boxShadow: '0 2px 16px -2px hsl(18 30% 50% / 0.07)' }}
        >
          <FeatureList />
        </div>

        {/* Plan Selection */}
        <div className="mb-8">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
            {t.subscription.selectPlan}
          </h3>
          <div className="space-y-3">
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

        {/* Purchase Feedback */}
        {purchaseState === 'success' && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/10 mb-6">
            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
            <p className="text-sm text-accent font-medium">{t.subscription.premiumActivated}</p>
          </div>
        )}
        {purchaseState === 'error' && purchaseError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 mb-6">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">{purchaseError}</p>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-4">
          <Button
            onClick={handlePurchase}
            disabled={purchaseState === 'loading' || !billingReady}
            className={cn(
              "w-full h-[56px] rounded-2xl text-[17px] font-semibold transition-all duration-200",
              billingReady
                ? "bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
            )}
            style={billingReady ? { boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.3)' } : undefined}
          >
            {purchaseState === 'loading' ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t.subscription.processing}</>
            ) : (
              <>Go Premium</>
            )}
          </Button>

          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full py-3 text-[14px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t.subscription.restorePurchases}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 text-[14px] text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Keep Exploring
          </button>
        </div>

        {/* Trust badge */}
        <div className="pt-8 pb-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{formatString(t.subscription.paymentsBy, { store: getStoreName() })}</span>
          </div>
          {!billingReady && (
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              {t.subscription.premiumComingSoon}<br />{t.subscription.noPaymentYet}
            </p>
          )}
        </div>
      </div>
      <ProfileGateModal open={showProfileGate} onOpenChange={setShowProfileGate} action="premium" />
    </div>
  );
}
