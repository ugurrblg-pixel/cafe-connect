import { useState, useEffect } from 'react';
import { X, Crown, MessageCircle, Eye, Clock, CheckCheck, Rocket, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getProducts, purchaseSubscription, isBillingReady, BillingProduct, PRODUCT_IDS } from '@/lib/billing';
import { usePremium } from '@/hooks/usePremium';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'chat_limit' | 'profile_views' | 'boost' | 'read_receipts' | 'general';
}

const TRIGGER_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  chat_limit: {
    title: 'Günlük sohbet limitine ulaştın',
    subtitle: 'Premium ile sınırsız sohbet başlat',
  },
  profile_views: {
    title: 'Profilini kim görüntüledi?',
    subtitle: 'Premium ile tüm ziyaretçilerini gör',
  },
  boost: {
    title: 'Profilini öne çıkar',
    subtitle: 'Premium ile daha fazla kişiye ulaş',
  },
  read_receipts: {
    title: 'Mesaj okundu bilgisi',
    subtitle: 'Premium ile mesajlarının okunup okunmadığını gör',
  },
  general: {
    title: 'Premium\'a Geç',
    subtitle: 'Tüm özelliklerin kilidini aç',
  },
};

const FEATURES = [
  { icon: MessageCircle, text: 'Sınırsız sohbet başlatma', free: '3/gün' },
  { icon: Eye, text: 'Profil görüntüleyenleri gör', free: '—' },
  { icon: Clock, text: 'Son görülme gizleme', free: '—' },
  { icon: CheckCheck, text: 'Mesaj okundu bilgisi', free: '—' },
  { icon: Rocket, text: '30 dakika profil boost', free: '—' },
  { icon: Trash2, text: 'Her iki taraftan mesaj silme', free: '—' },
];

export function PaywallModal({ isOpen, onClose, trigger = 'general' }: PaywallModalProps) {
  const { user } = useAuth();
  const { refreshSubscription } = usePremium();
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCT_IDS.YEARLY);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingReady, setBillingReady] = useState(false);
  const [checkingBilling, setCheckingBilling] = useState(true);

  const message = TRIGGER_MESSAGES[trigger];

  // Check billing availability and load products when modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckingBilling(true);
      Promise.all([
        isBillingReady(),
        getProducts()
      ]).then(([ready, prods]) => {
        setBillingReady(ready);
        setProducts(prods);
        setCheckingBilling(false);
      });
    }
  }, [isOpen]);

  const handlePurchase = async () => {
    if (!user || !billingReady) return;

    setPurchasing(true);
    setError(null);

    try {
      const result = await purchaseSubscription(selectedProduct, user.id);
      
      if (result.success) {
        await refreshSubscription();
        onClose();
      } else {
        setError(result.error || 'Satın alma başarısız oldu');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setPurchasing(false);
    }
  };

  if (!isOpen) return null;

  const monthlyProduct = products.find(p => p.productId === PRODUCT_IDS.MONTHLY);
  const yearlyProduct = products.find(p => p.productId === PRODUCT_IDS.YEARLY);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-6 px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{message.title}</h2>
          <p className="text-muted-foreground mt-1">{message.subtitle}</p>
        </div>

        {/* Features */}
        <div className="px-6 py-4">
          <div className="space-y-3">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 text-sm text-foreground">{feature.text}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  {feature.free}
                </span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            ))}
          </div>
        </div>

        {/* Plan selection */}
        <div className="px-6 py-4 space-y-3">
          {/* Yearly - Best value */}
          <button
            onClick={() => setSelectedProduct(PRODUCT_IDS.YEARLY)}
            disabled={!billingReady}
            className={`w-full p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
              selectedProduct === PRODUCT_IDS.YEARLY
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${!billingReady ? 'opacity-60' : ''}`}
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
            disabled={!billingReady}
            className={`w-full p-4 rounded-2xl border-2 transition-all ${
              selectedProduct === PRODUCT_IDS.MONTHLY
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${!billingReady ? 'opacity-60' : ''}`}
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

        {/* Error message */}
        {error && (
          <div className="px-6 py-2">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Coming Soon Notice (when billing not ready) */}
        {!checkingBilling && !billingReady && (
          <div className="px-6 py-2">
            <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">
                Premium abonelik yakında Google Play üzerinden kullanılabilir olacak.
              </p>
            </div>
          </div>
        )}

        {/* Purchase button */}
        <div className="px-6 pb-6 pt-2 safe-bottom">
          <Button
            onClick={handlePurchase}
            disabled={purchasing || checkingBilling || !billingReady}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary hover:bg-primary/90"
          >
            {checkingBilling ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Kontrol ediliyor...
              </span>
            ) : purchasing ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                İşleniyor...
              </span>
            ) : !billingReady ? (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Çok Yakında
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Premium'a Geç
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            {billingReady 
              ? 'İstediğin zaman iptal edebilirsin. Abonelik Google Play üzerinden yönetilir.'
              : 'Abonelik sadece Google Play Billing üzerinden yapılabilir.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
