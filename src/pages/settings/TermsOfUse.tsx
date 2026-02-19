import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';

export default function TermsOfUse() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Kullanım Koşulları" showBack />
        <main className="pt-16 px-4 max-w-lg mx-auto">
          {/* Title & Date */}
          <div className="py-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">CAFE MEET KULLANIM KOŞULLARI</h1>
            <p className="text-sm text-muted-foreground mt-2">Son Güncelleme Tarihi: 19 Şubat 2026</p>
          </div>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">
            {/* 1. Taraflar */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. Taraflar</h2>
              <p className="mb-2">
                İşbu Kullanım Koşulları ("Sözleşme"), Türkiye Cumhuriyeti kanunlarına göre kurulmuş şahıs işletmesi olan <strong>UĞUR BİLGİN</strong> ("Şirket") ile CafeMeet mobil uygulamasını kullanan gerçek kişi ("Kullanıcı") arasında akdedilmiştir.
              </p>
              <p className="mb-2">
                İletişim: <a href="mailto:support@cafemeet.co" className="text-primary underline">support@cafemeet.co</a>
              </p>
              <p>
                Kullanıcı, uygulamaya kayıt olarak bu sözleşmeyi elektronik ortamda kabul etmiş sayılır.
              </p>
            </section>

            {/* 2. Hizmetin Niteliği */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Hizmetin Niteliği</h2>
              <p className="mb-2">
                CafeMeet, kullanıcıların sosyal mekanlarda (kafe, bar, etkinlik alanı vb.) tanışmasını sağlayan konum bazlı dijital eşleşme platformudur.
              </p>
              <p className="mb-2">CafeMeet:</p>
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
              <p className="mb-2">CafeMeet yalnızca 18 yaş ve üzeri bireyler tarafından kullanılabilir.</p>
              <p className="mb-1">Kullanıcı:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>18 yaşından büyük olduğunu</li>
                <li>Verdiği bilgilerin doğru olduğunu</li>
              </ol>
              <p className="mt-2">beyan eder.</p>
              <p className="mt-2">Yaşın yanlış beyanından doğacak hukuki sorumluluk kullanıcıya aittir.</p>
              <p>Şirket gerekli gördüğünde kimlik doğrulama talep edebilir.</p>
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
            </section>

            {/* 5. Fiziksel Buluşmalar */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Fiziksel Buluşmalar ve Sorumluluk</h2>
              <p className="mb-2">
                CafeMeet üzerinden tanışan kullanıcıların gerçekleştirdiği fiziksel buluşmalar tamamen kullanıcıların sorumluluğundadır.
              </p>
              <p className="mb-1">Şirket:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Kullanıcı kimliğini garanti etmez</li>
                <li>Offline gerçekleşen olaylardan sorumlu değildir</li>
                <li>Mekan güvenliğini garanti etmez</li>
              </ol>
            </section>

            {/* 6. Konum Verisi */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Konum Verisi</h2>
              <p className="mb-2">CafeMeet, konum verisini:</p>
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
              <p className="mb-2">Kullanıcı hesabını istediği zaman silebilir.</p>
              <p className="mb-1">Hesap silindiğinde:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Profil görünürlüğü kaldırılır</li>
                <li>Veriler anonimleştirilebilir</li>
                <li>Yasal yükümlülükler kapsamında saklanabilir</li>
              </ol>
            </section>

            {/* 8. Sorumluluğun Sınırlandırılması */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Sorumluluğun Sınırlandırılması</h2>
              <p className="mb-2">Şirket;</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Sistem kesintileri</li>
                <li>Veri kaybı</li>
                <li>Kullanıcı davranışları</li>
                <li>Üçüncü taraf mekan hizmetleri</li>
              </ol>
              <p className="mt-2">nedeniyle oluşabilecek zararlardan sorumlu değildir.</p>
            </section>

            {/* 9. Yetkili Mahkeme */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Yetkili Mahkeme</h2>
              <p>Uyuşmazlıklarda Şirket merkezinin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.</p>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-12 mb-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">© 2026 CafeMeet – Tüm Hakları Saklıdır</p>
            <a href="mailto:support@cafemeet.co" className="text-xs text-primary underline">
              support@cafemeet.co
            </a>
          </footer>
        </main>
      </div>
    </PageLayout>
  );
}
