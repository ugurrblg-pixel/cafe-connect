import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { ChevronRight, BookOpen, MapPin, Crown, Mail, FileText, Scale } from 'lucide-react';

interface HelpItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

export default function HelpSupport() {
  const items: HelpItem[] = [
    {
      icon: <BookOpen className="w-5 h-5 text-primary" />,
      label: 'Nasıl Çalışır?',
      description: 'Uygulamanın temel özelliklerini öğrenin',
      href: '#how-it-works',
    },
    {
      icon: <MapPin className="w-5 h-5 text-accent" />,
      label: 'Konum Neden Gerekli?',
      description: 'Konum kullanımı hakkında bilgi',
      href: '#location',
    },
    {
      icon: <Crown className="w-5 h-5 text-warning" />,
      label: 'Premium & Ödemeler',
      description: 'Abonelik ve ödeme bilgileri',
      href: '#premium',
    },
    {
      icon: <Mail className="w-5 h-5 text-primary" />,
      label: 'Bize Ulaşın',
      description: 'Soru veya geri bildirim gönderin',
      href: 'mailto:support@cafehuddle.app',
    },
    {
      icon: <FileText className="w-5 h-5 text-muted-foreground" />,
      label: 'Gizlilik Politikası',
      description: 'Verilerinizi nasıl koruyoruz',
      href: '#privacy-policy',
    },
    {
      icon: <Scale className="w-5 h-5 text-muted-foreground" />,
      label: 'Kullanım Koşulları',
      description: 'Hizmet şartlarımız',
      href: '#terms',
    },
  ];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Yardım & Destek" showBack />

        <main className="pt-16 px-4">
          {/* FAQ Sections */}
          <section className="card-elevated overflow-hidden">
            {items.map(({ icon, label, description, href }, idx) => (
              <a
                key={label}
                href={href}
                className={`flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors ${
                  idx < items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    {icon}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </a>
            ))}
          </section>

          <p className="text-xs text-muted-foreground text-center mt-6 px-4">
            Cafe Huddle v1.0 — Güvenliğiniz bizim için önemli ☕
          </p>
        </main>
      </div>
    </PageLayout>
  );
}
