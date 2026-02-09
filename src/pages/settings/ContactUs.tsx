import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Mail, Clock, MessageSquare } from 'lucide-react';

export default function ContactUs() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Bize Ulaşın" showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">
            Soru, öneri veya geri bildirimleriniz için bizimle iletişime geçebilirsiniz.
          </p>

          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">E-posta</h3>
                <a href="mailto:destek@cafemeet.app" className="text-sm text-primary underline">
                  destek@cafemeet.app
                </a>
              </div>
            </div>
          </section>

          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Yanıt Süresi</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  E-postalara genellikle 24–48 saat içinde yanıt verilir.
                </p>
              </div>
            </div>
          </section>

          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Geri Bildirim</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  CafeMeet'i geliştirmemize yardımcı olmak için görüş ve önerilerinizi bekliyoruz.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageLayout>
  );
}
