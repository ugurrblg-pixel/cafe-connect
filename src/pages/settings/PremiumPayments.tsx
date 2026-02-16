import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Crown, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export default function PremiumPayments() {
  const { t } = useI18n();

  const items = [
    { icon: <Crown className="w-6 h-6 text-primary" />, title: t.premiumInfo.premiumTitle, description: t.premiumInfo.premiumDesc },
    { icon: <CreditCard className="w-6 h-6 text-primary" />, title: t.premiumInfo.securePayment, description: t.premiumInfo.securePaymentDesc },
    { icon: <RefreshCw className="w-6 h-6 text-primary" />, title: t.premiumInfo.manageSubscription, description: t.premiumInfo.manageSubscriptionDesc },
    { icon: <ShieldCheck className="w-6 h-6 text-primary" />, title: t.premiumInfo.refundPolicy, description: t.premiumInfo.refundPolicyDesc },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.premiumInfo.title} showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">{t.premiumInfo.intro}</p>
          {items.map(({ icon, title, description }, idx) => (
            <section key={idx} className="card-elevated p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
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
