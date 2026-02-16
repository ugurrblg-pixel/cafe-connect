import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Coffee, Users, MessageCircle, Heart } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export default function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    { icon: <Coffee className="w-6 h-6 text-primary" />, title: t.howItWorks.step1Title, description: t.howItWorks.step1Desc },
    { icon: <Users className="w-6 h-6 text-primary" />, title: t.howItWorks.step2Title, description: t.howItWorks.step2Desc },
    { icon: <Heart className="w-6 h-6 text-primary" />, title: t.howItWorks.step3Title, description: t.howItWorks.step3Desc },
    { icon: <MessageCircle className="w-6 h-6 text-primary" />, title: t.howItWorks.step4Title, description: t.howItWorks.step4Desc },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.howItWorks.title} showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">{t.howItWorks.intro}</p>
          {steps.map(({ icon, title, description }, idx) => (
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
