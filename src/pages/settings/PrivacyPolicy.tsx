import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { useI18n } from '@/contexts/I18nContext';

export default function PrivacyPolicy() {
  const { t } = useI18n();

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.privacyPolicyPage.title} showBack />
        <main className="pt-16 px-4 space-y-4">
          {([
            ['dataCollection', 'dataCollectionDesc'],
            ['dataUsage', 'dataUsageDesc'],
            ['dataSecurity', 'dataSecurityDesc'],
            ['locationData', 'locationDataDesc'],
            ['yourRights', 'yourRightsDesc'],
          ] as const).map(([titleKey, descKey]) => (
            <section key={titleKey} className="card-elevated p-4">
              <h2 className="font-semibold text-foreground mb-2">{t.privacyPolicyPage[titleKey]}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.privacyPolicyPage[descKey]}</p>
            </section>
          ))}

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t.privacyPolicyPage.lastUpdated}
          </p>
        </main>
      </div>
    </PageLayout>
  );
}
