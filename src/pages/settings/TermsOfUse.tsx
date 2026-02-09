import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';

export default function TermsOfUse() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Kullanım Koşulları" showBack />
        <main className="pt-16 px-4 space-y-4">
          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Hizmet Tanımı</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CafeMeet, kullanıcıların yakındaki kafelerde bulunan diğer kişilerle bağlantı kurmasını sağlayan bir sosyal uygulamadır. Hizmetlerimizi kullanarak bu koşulları kabul etmiş sayılırsınız.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Kullanıcı Sorumlulukları</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kullanıcılar doğru bilgi sağlamakla, saygılı davranmakla ve topluluk kurallarına uymakla yükümlüdür. Sahte profil oluşturmak, taciz, spam veya kötüye kullanım kesinlikle yasaktır.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Hesap Yönetimi</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hesap güvenliğinizden siz sorumlusunuz. Hesabınızı istediğiniz zaman silebilirsiniz. Hesap silme işlemi geri alınamaz ve tüm verileriniz kaldırılır.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">Premium Abonelik</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium özellikler Google Play üzerinden satın alınır. Abonelikler otomatik olarak yenilenir ve Google Play üzerinden yönetilir. İade politikası Google Play koşullarına tabidir.
            </p>
          </section>

          <section className="card-elevated p-4">
            <h2 className="font-semibold text-foreground mb-2">İhlal ve Yaptırımlar</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kullanım koşullarının ihlali durumunda CafeMeet, uyarı verme, hesabı geçici olarak askıya alma veya kalıcı olarak kaldırma hakkını saklı tutar.
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
