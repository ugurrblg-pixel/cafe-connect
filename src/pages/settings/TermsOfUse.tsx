import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Link } from 'react-router-dom';

export default function TermsOfUse() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Kullanım Koşulları" showBack />
        <main className="pt-20 px-5 max-w-lg mx-auto">
          {/* Title & Date */}
          <div className="py-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">RİYO KULLANIM KOŞULLARI</h1>
            <p className="text-sm text-muted-foreground mt-2">Son güncelleme <time dateTime="2026-11-10">10 Kasım 2026</time></p>
          </div>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">
            {/* 1. Taraflar */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. Taraflar</h2>
              <p className="mb-2">
                Bu koşullar Riyo hizmetini sunan <strong>UĞUR BİLGİN</strong> ile hizmeti kullanan kişi arasındaki ilişkiyi düzenler.
              </p>
              <p className="mb-2">
                İletişim: <a href="mailto:support@cafemeet.com" className="text-primary underline">support@cafemeet.com</a>
              </p>
              <p>
                Kullanıcı, kayıt sırasında kullanım koşullarını elektronik ortamda kabul eder. Kişisel verilerin işlenmesi <Link to="/settings/help/privacy-policy" className="text-primary underline">Gizlilik Politikası</Link> sayfasında açıklanır.
              </p>
            </section>

            {/* 2. Hizmetin Niteliği */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Hizmetin Niteliği</h2>
              <p className="mb-2">
                Riyo, kullanıcıların sosyal mekanlarda (kafe, bar, etkinlik alanı vb.) tanışmasını sağlayan konum bazlı dijital eşleşme platformudur.
              </p>
              <p className="mb-2">Riyo:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Evlilik ajansı değildir</li>
                <li>Resmi aracılık hizmeti sunmaz</li>
                <li>Güvenlik veya kimlik doğrulama garantisi vermez</li>
                <li>Kullanıcı davranışlarını kontrol etmez</li>
              </ol>
              <p className="mt-2">Platform yalnızca dijital ortam sağlar.</p>
            </section>

            {/* 3. Yaş Sınırı */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Yaş Sınırı</h2>
              <p className="mb-2">Riyo yalnızca 18 yaş ve üzeri bireyler tarafından kullanılabilir.</p>
              <p className="mb-1">Kullanıcı:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>En az 18 yaşında olduğunu</li>
                <li>Verdiği bilgilerin doğru olduğunu</li>
              </ol>
              <p className="mt-2">beyan eder.</p>
              <p className="mt-2">Yaşın yanlış beyanından doğacak hukuki sorumluluk kullanıcıya aittir.</p>
            </section>

            {/* 4. Kullanıcı Yükümlülükleri */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Kullanıcı Yükümlülükleri</h2>
              <p className="mb-2">Kullanıcı aşağıdaki eylemlerde bulunamaz:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Sahte profil oluşturmak</li>
                <li>Başkasına ait fotoğraf kullanmak</li>
                <li>Taciz, tehdit veya ısrarlı takip yapmak</li>
                <li>Müstehcen içerik paylaşmak</li>
                <li>Dolandırıcılık girişiminde bulunmak</li>
                <li>Spam veya ticari kullanım yapmak</li>
              </ol>
              <p className="mt-2">İhlal halinde hesap askıya alınabilir veya kapatılabilir.</p>
              <p className="mt-2"><Link to="/community-rules" className="text-primary underline">Topluluk Kuralları</Link> sayfasında bildirim, engelleme ve itiraz adımlarını bulabilirsiniz.</p>
            </section>

            {/* 5. Fiziksel Buluşmalar */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Fiziksel Buluşmalar ve Sorumluluk</h2>
              <p className="mb-2">
                Fiziksel buluşmalara katılma kararını kullanıcılar verir. Tanımadığınız kişilerle buluşurken halka açık bir mekân seçin.
              </p>
              <p>Profil doğrulaması sınırlı bir fotoğraf incelemesidir. Mekân güvenliği veya diğer kullanıcıların davranışları hakkında garanti vermez.</p>
            </section>

            {/* 6. Konum Verisi */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Konum Verisi</h2>
              <p className="mb-2">Riyo, konum verisini:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Yakındaki mekanları göstermek</li>
                <li>Eşleşme optimizasyonu</li>
                <li>Check-in özelliği</li>
              </ol>
              <p className="mt-2">amaçlarıyla kullanır.</p>
              <p>Kullanıcı konum paylaşımını cihaz ayarlarından kapatabilir.</p>
            </section>

            {/* 7. Hesap Silme */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. Hesap Silme</h2>
              <p><Link to="/account-deletion" className="text-primary underline">Hesap ve veri silme</Link> sayfasından işlemi başlatabilirsiniz. Tamamlandığında hesap, profil, fotoğraflar ve gönderdiğiniz mesajlar aktif sistemden kaldırılır. Sınırlı moderasyon kayıtları ve önceki yedek kopyaları hakkında Gizlilik Politikası’na bakabilirsiniz.</p>
            </section>

            {/* 8. Sorumluluğun Sınırlandırılması */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Sorumluluğun Sınırlandırılması</h2>
              <p>Üçüncü taraf mekânların çalışma saatleri ve hizmetleri değişebilir. Bu koşullar kapsamında uygulanması zorunlu yasal haklarınız saklıdır.</p>
            </section>

            {/* 9. Yetkili Mahkeme */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Uyuşmazlıklar</h2>
              <p>Hizmetle ilgili başvurularınızı destek adresine iletebilirsiniz. Kanunen yetkili mercilere başvurma hakkınız saklıdır.</p>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-12 mb-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">© 2026 Riyo – Tüm Hakları Saklıdır</p>
            <a href="mailto:support@cafemeet.com" className="text-xs text-primary underline">
              support@cafemeet.com
            </a>
          </footer>
        </main>
      </div>
    </PageLayout>
  );
}
