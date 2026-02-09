import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Coffee, Users, MessageCircle, Heart } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: <Coffee className="w-6 h-6 text-primary" />,
      title: 'Yakındaki Kafeleri Keşfet',
      description: 'CafeMeet, bulunduğun konuma yakın kafeleri gösterir. Gittiğin kafeye check-in yaparak orada bulunan insanlarla tanışmaya başla.',
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: 'İnsanları Keşfet',
      description: 'Aynı kafede bulunan kişilerin profillerini gör. İlgi alanlarını, hobilerini ve burada olma amaçlarını öğren.',
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: 'Eşleş ve Bağlan',
      description: 'Hoşlandığın kişilere wave gönder. Karşılıklı ilgi olduğunda eşleşin ve sohbet etmeye başlayın.',
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-primary" />,
      title: 'Güvenli Sohbet',
      description: 'Eşleştiğin kişilerle güvenli ortamda mesajlaş. CafeMeet\'in amacı gerçek hayatta doğal, güvenli ve saygılı bağlantılar kurmaktır.',
    },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="CafeMeet Nasıl Çalışır?" showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">
            CafeMeet, gerçek kafelerde doğal bağlantılar kurmanı sağlar. Check-in yap, insanları keşfet, eşleş ve sohbet et.
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
