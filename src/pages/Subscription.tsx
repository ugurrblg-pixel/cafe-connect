import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import { getProducts, purchaseSubscription, restorePurchases, BillingProduct, PRODUCT_IDS } from '@/lib/billing';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const FEATURES = [
  'Sınırsız sohbet başlatma',
  'Profil görüntüleyenleri gör',
  'Son görülme gizleme',
  'Mesaj okundu bilgisi',
  '30 dakika profil boost',
  'Her iki taraftan mesaj silme',
];

export default function Subscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, isPremium, refreshSubscription, loading: premiumLoading } = usePremium();
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCT_IDS.YEARLY);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const handlePurchase = async () => {
    if (!user) return;

    setPurchasing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await purchaseSubscription(selectedProduct, user.id);
      
      if (result.success) {
        await refreshSubscription();
        setSuccess('Premium aboneliğiniz aktif edildi! 🎉');
      } else {
        setError(result.error || 'Satın alma başarısız oldu');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;

    setRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await restorePurchases(user.id);
      
      if (result.success) {
        await refreshSubscription();
        setSuccess('Aboneliğiniz geri yüklendi!');
      } else {
        setError(result.error || 'Geri yükleme başarısız oldu');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setRestoring(false);
    }
  };

  const monthlyProduct = products.find(p => p.productId === PRODUCT_IDS.MONTHLY);
  const yearlyProduct = products.find(p => p.productId === PRODUCT_IDS.YEARLY);

  return (
    <div className="min-h-screen bg-background pb-20">
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
          {/* Current Status */}
          {isPremium && subscription && (
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-5 border border-amber-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Premium Aktif</h2>
                  <p className="text-sm text-muted-foreground">
                    {subscription.plan_type === 'yearly' ? 'Yıllık' : 'Aylık'} Plan
                  </p>
                </div>
              </div>
              {subscription.expires_at && (
                <p className="text-sm text-muted-foreground">
                  Yenilenme tarihi: {format(new Date(subscription.expires_at), 'd MMMM yyyy', { locale: tr })}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  // Open Google Play subscription management
                  window.open('https://play.google.com/store/account/subscriptions', '_blank');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Aboneliği Yönet
              </Button>
            </div>
          )}

          {/* Features */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Premium Özellikleri</h3>
            <div className="space-y-2">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Selection (only show if not premium) */}
          {!isPremium && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Plan Seç</h3>
                
                {/* Yearly */}
                <button
                  onClick={() => setSelectedProduct(PRODUCT_IDS.YEARLY)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                    selectedProduct === PRODUCT_IDS.YEARLY
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-xl">
                    %40 TASARRUF
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Yıllık Plan</div>
                      <div className="text-sm text-muted-foreground">
                        {yearlyProduct?.price || '₺359,99'}/yıl
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        ₺29,99<span className="text-sm font-normal text-muted-foreground">/ay</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Monthly */}
                <button
                  onClick={() => setSelectedProduct(PRODUCT_IDS.MONTHLY)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all ${
                    selectedProduct === PRODUCT_IDS.MONTHLY
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Aylık Plan</div>
                      <div className="text-sm text-muted-foreground">Her ay yenilenir</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        {monthlyProduct?.price || '₺49,99'}<span className="text-sm font-normal text-muted-foreground">/ay</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Messages */}
              {error && (
                <p className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-xl">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-accent text-center p-3 bg-accent/10 rounded-xl">
                  {success}
                </p>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing || premiumLoading}
                  className="w-full h-14 rounded-2xl text-lg font-semibold"
                >
                  {purchasing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      İşleniyor...
                    </span>
                  ) : (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      Premium'a Geç
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRestore}
                  disabled={restoring}
                  className="w-full"
                >
                  {restoring ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Satın Alımları Geri Yükle
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Abonelik Google Play üzerinden yönetilir. İstediğin zaman iptal edebilirsin.
                Kalan süre için iade yapılmaz.
              </p>
            </>
          )}
        </div>
      </div>
  );
}
