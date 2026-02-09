import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Crown, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';

export default function PremiumPayments() {
  const items = [
    {
      icon: <Crown className="w-6 h-6 text-primary" />,
      title: 'CafeMeet Premium',
      description: 'Premium ile sınırsız sohbet, profil görüntüleyenleri görme, boost ve gelişmiş görünürlük gibi özel özelliklere eriş.',
    },
    {
      icon: <CreditCard className="w-6 h-6 text-primary" />,
      title: 'Güvenli Ödeme',
      description: 'Tüm ödemeler Google Play Faturalandırma üzerinden güvenli bir şekilde işlenir. Uygulama içinde kredi kartı bilgisi saklanmaz.',
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-primary" />,
      title: 'Abonelik Yönetimi',
      description: 'Aboneliğini Google Play üzerinden istediğin zaman yönetebilir veya iptal edebilirsin. İptal sonrası dönem sonuna kadar premium erişimin devam eder.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-primary" />,
      title: 'İade Politikası',
      description: 'İade talepleri Google Play politikalarına tabidir. Detaylı bilgi için Google Play destek sayfasını ziyaret edebilirsin.',
    },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Premium & Ödemeler" showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">
            CafeMeet Premium abonelik ve ödeme süreçleri hakkında bilgi.
          </p>

          {items.map(({ icon, title, description }, idx) => (
            <section key={idx} className="card-elevated p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            </section>
          ))}
        </main>
      </div>
    </PageLayout>
  );
}
