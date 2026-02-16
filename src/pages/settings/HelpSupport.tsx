import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { ChevronRight, BookOpen, MapPin, Crown, Mail, FileText, Scale } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export default function HelpSupport() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const items = [
    { icon: <BookOpen className="w-5 h-5 text-primary" />, label: t.settings.howItWorks, description: t.settings.howItWorksDesc, onClick: () => navigate('/settings/help/how-it-works') },
    { icon: <MapPin className="w-5 h-5 text-accent" />, label: t.settings.locationWhy, description: t.settings.locationWhyDesc, onClick: () => navigate('/settings/help/location') },
    { icon: <Crown className="w-5 h-5 text-primary" />, label: t.settings.premiumPayments, description: t.settings.premiumPaymentsDesc, onClick: () => navigate('/settings/help/premium') },
    { icon: <Mail className="w-5 h-5 text-primary" />, label: t.settings.contactUs, description: t.settings.contactUsDesc, onClick: () => navigate('/settings/help/contact') },
    { icon: <FileText className="w-5 h-5 text-muted-foreground" />, label: t.settings.privacyPolicy, description: t.settings.privacyPolicyDesc, onClick: () => navigate('/settings/help/privacy-policy') },
    { icon: <Scale className="w-5 h-5 text-muted-foreground" />, label: t.settings.termsOfUse, description: t.settings.termsOfUseDesc, onClick: () => navigate('/settings/help/terms') },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.settings.helpSupport} showBack />
        <main className="pt-16 px-4">
          <section className="card-elevated overflow-hidden">
            {items.map(({ icon, label, description, onClick }, idx) => (
              <button key={label} onClick={onClick} className={`w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left ${idx < items.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">{icon}</div>
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </section>
          <p className="text-xs text-muted-foreground text-center mt-6 px-4">{t.settings.version}</p>
        </main>
      </div>
    </PageLayout>
  );
}
