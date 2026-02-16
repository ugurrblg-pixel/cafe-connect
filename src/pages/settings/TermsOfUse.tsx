import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { useI18n } from '@/contexts/I18nContext';

export default function TermsOfUse() {
  const { t } = useI18n();

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.termsOfUsePage.title} showBack />
        <main className="pt-16 px-4 space-y-4">
          {([
            ['serviceDefinition', 'serviceDefinitionDesc'],
            ['userResponsibilities', 'userResponsibilitiesDesc'],
            ['accountManagement', 'accountManagementDesc'],
            ['premiumSubscription', 'premiumSubscriptionDesc'],
            ['violations', 'violationsDesc'],
          ] as const).map(([titleKey, descKey]) => (
            <section key={titleKey} className="card-elevated p-4">
              <h2 className="font-semibold text-foreground mb-2">{t.termsOfUsePage[titleKey]}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.termsOfUsePage[descKey]}</p>
            </section>
          ))}

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t.termsOfUsePage.lastUpdated}
          </p>
        </main>
      </div>
    </PageLayout>
  );
}
