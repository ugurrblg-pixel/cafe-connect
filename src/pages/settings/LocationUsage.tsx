import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { MapPin, ShieldCheck, Settings, EyeOff } from 'lucide-react';

export default function LocationUsage() {
  const items = [
    {
      icon: <MapPin className="w-6 h-6 text-primary" />,
      title: 'Konum Ne İçin Kullanılır?',
      description: 'Konumun yalnızca yakındaki kafeleri göstermek ve check-in doğrulaması için kullanılır. Sana en yakın mekanları bulmana yardımcı olur.',
    },
    {
      icon: <EyeOff className="w-6 h-6 text-primary" />,
      title: 'Arka Planda Takip Yok',
      description: 'Konum bilgin arka planda sürekli takip edilmez. Yalnızca uygulamayı aktif olarak kullandığında konum verisi işlenir.',
    },
    {
      icon: <Settings className="w-6 h-6 text-primary" />,
      title: 'İstediğin Zaman Kapat',
      description: 'Cihaz ayarlarından konum erişimini istediğin zaman devre dışı bırakabilirsin. Bu durumda yakındaki kafeler gösterilemez.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-primary" />,
      title: 'Gizliliğin Korunur',
      description: 'Tam konumun diğer kullanıcılarla asla paylaşılmaz. Mesafeler yuvarlak değerlerle gösterilir (ör. "500m içinde").',
    },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Konum Kullanımı" showBack />
        <main className="pt-16 px-4 space-y-4">
          <p className="text-muted-foreground text-sm mt-2">
            Konum bilgini nasıl kullandığımız ve gizliliğini nasıl koruduğumuz hakkında bilgi.
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
