import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';

export default function PrivacyPolicy() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Gizlilik Politikası" showBack />
        <main className="pt-16 px-4 space-y-4">
          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Veri Toplama</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CafeMeet, hizmetlerini sunmak için gerekli olan minimum düzeyde kişisel veri toplar. Bu veriler arasında profil bilgileri, konum verisi (yalnızca uygulama kullanılırken) ve iletişim tercihleri yer alır.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Veri Kullanımı</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Toplanan veriler yalnızca yakındaki kafeleri göstermek, kullanıcıları eşleştirmek ve uygulama deneyimini iyileştirmek için kullanılır. Verileriniz hiçbir koşulda üçüncü taraflara satılmaz.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Veri Güvenliği</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kişisel verileriniz endüstri standartlarında şifreleme ile korunur. Güvenlik önlemlerimizi sürekli olarak güncelliyoruz.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Konum Verisi</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Konum bilginiz yalnızca uygulama ön plandayken ve aktif olarak kullanıldığında işlenir. Arka planda konum takibi yapılmaz. Tam konumunuz diğer kullanıcılarla paylaşılmaz.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Haklarınız</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verilerinize erişim talep edebilir, düzeltme isteyebilir veya hesabınızı silerek tüm verilerinizin kaldırılmasını sağlayabilirsiniz. Talepleriniz için destek@cafemeet.app adresine ulaşabilirsiniz.
            </p>
          </section>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Son güncelleme: Şubat 2026
          </p>
        </main>
      </div>
    </PageLayout>
  );
}
