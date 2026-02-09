import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Coffee, Users, MessageCircle, Heart } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: <Coffee className="w-6 h-6 text-primary" />,
      title: 'Yakındaki Kafeleri Keşfet',
      description: 'Cafe Huddle, bulunduğun konuma yakın kafeleri gösterir. Gittiğin kafeye check-in yaparak oradaki insanlarla etkileşime geçebilirsin.',
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: 'Profilleri İncele',
      description: 'Aynı kafede bulunan kişilerin profillerini gör. Hobilerini, ilgi alanlarını ve burada bulunma amaçlarını keşfet.',
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: 'Eşleş ve Tanış',
      description: 'Beğendiğin kişilere wave gönder. Karşılıklı wave ile eşleşin ve sohbet etmeye başlayın.',
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-primary" />,
      title: 'Güvenli Sohbet',
      description: 'Eşleştiğin kişilerle güvenli bir ortamda mesajlaş. Amacımız gerçek dünyada doğal ve güvenli bağlantılar kurmaktır.',
    },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Nasıl Çalışır?" showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">
            Cafe Huddle, yakındaki kafeleri keşfetmeni ve aynı mekândaki insanlarla bağlantı kurmanı sağlar.
          </p>

          {steps.map(({ icon, title, description }, idx) => (
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
