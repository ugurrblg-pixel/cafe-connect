import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Mail, Clock, MessageSquare } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export default function ContactUs() {
  const { t } = useI18n();

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.contact.title} showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">{t.contact.intro}</p>

          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t.contact.emailTitle}</h3>
                <a href="mailto:support@riyoapp.com" className="text-sm text-primary underline">support@riyoapp.com</a>
              </div>
            </div>
          </section>

          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t.contact.responseTime}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.contact.responseTimeDesc}</p>
              </div>
            </div>
          </section>

          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t.contact.feedback}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.contact.feedbackDesc}</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
}
