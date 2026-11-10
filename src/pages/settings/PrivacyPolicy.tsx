import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Gizlilik Politikası" showBack />
        <main className="pt-20 px-5 max-w-lg mx-auto">
          {/* Title & Date */}
          <div className="py-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">RİYO GİZLİLİK POLİTİKASI</h1>
            <p className="text-sm text-muted-foreground mt-2">Son güncelleme <time dateTime="2026-11-10">10 Kasım 2026</time></p>
          </div>

          {/* Veri Sorumlusu */}
          <div className="mb-8 p-4 rounded-xl bg-secondary/50">
            <h2 className="font-semibold text-foreground mb-1">Veri sorumlusu</h2>
            <p className="text-sm text-foreground">UĞUR BİLGİN</p>
            <p className="text-sm text-foreground">
              İletişim: <a href="mailto:support@cafemeet.com" className="text-primary underline">support@cafemeet.com</a>
            </p>
          </div>

          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">Bu politika Riyo’nun web sitesini ve tarayıcıdan telefona eklenen sürümünü kapsar. Riyo, 18 yaş ve üzeri kişiler içindir.</p>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">
            {/* 1. İşlenen Veriler */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. İşlenen Veriler</h2>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Kayıt sırasında verdiğiniz e-posta adresi, ad ve doğum tarihi ile profilinize eklediğiniz bilgiler</li>
                <li>Profil fotoğrafları ve doğrulama başvurusu yaparsanız doğrulama selfieniz</li>
                <li>İzin verdiğinizde cihazınızdan alınan konum ve yaptığınız mekân check-in’leri</li>
                <li>Uygulamada yaptığınız eşleşmeler, gönderdiğiniz mesajlar ve katıldığınız aktiviteler</li>
                <li>Gönderdiğiniz destek talepleri ve bildirimler ile bunları incelemek için gereken işlem kayıtları</li>
                <li>Bağlantı sırasında oluşan IP adresi, tarayıcı ve hizmete erişim bilgileri</li>
              </ol>
              <p className="mt-3">Bilgileri kayıt, profil düzenleme ve uygulama içi işlemler sırasında sizden alırız. Google ile giriş yaparsanız Google, giriş işlemi için hesabınıza ait e-posta ve temel profil bilgilerini Riyo’ya iletir.</p>
            </section>

            {/* 2. Veri İşleme Amaçları */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Veri İşleme Amaçları</h2>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Hesabınızı açmak, yaş şartını kontrol etmek ve oturumunuzu yönetmek</li>
                <li>Yakındaki mekânları göstermek, check-in’i doğrulamak, eşleşme, mesajlaşma ve aktiviteleri sağlamak</li>
                <li>İsteğe bağlı hesap doğrulamasını yürütmek, bildirimleri incelemek ve kötüye kullanımı önlemek</li>
                <li>Destek taleplerini yanıtlamak, teknik hataları gidermek ve veri kaybı sonrası hizmeti kurtarmak</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Fotoğraflar ve hesap doğrulama</h2>
              <div className="space-y-3">
                <p>Yeni profil fotoğrafı yüklerken verdiğiniz izinle fotoğraf, cinsel içerik, şiddet ve kendine zarar içeriği açısından denetlenmek üzere OpenAI’a gönderilir. Denetimden geçmeyen veya denetimi tamamlanamayan yeni fotoğraflar profilinize eklenmez.</p>
                <p>Hesap doğrulaması isteğe bağlıdır. Başvurunuz beklemedeyken yetkili Riyo ekibi, gönderdiğiniz selfie ile başvuru anındaki ana profil fotoğrafınızı ilk 7 gün içinde elle karşılaştırabilir. Selfie diğer kullanıcılara gösterilmez ve otomatik profil fotoğrafı denetimine gönderilmez. Bu 7 gün, ekibin başvuruyu inceleyebildiği süredir.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Konum ve görünürlük</h2>
              <div className="space-y-3">
                <p>Konum izni verdiğinizde Riyo, yakındaki mekânları bulmak ve check-in için mekâna yakınlığınızı doğrulamak üzere cihazınızın konumunu kullanır. Yakındaki mekânlar için ek arama gerektiğinde Riyo, yaklaşık arama alanının koordinatlarını Google Places’a gönderir.</p>
                <p>Gizlilik ve engelleme ayarları izin verdiğinde aynı mekânda aktif check-in yapan kişiler, mekândaki varlığınızı, sınırlı profilinizi ve onaylı profil fotoğraflarınızı görebilir. Telefonunuzun GPS koordinatları bu profil kartında yer almaz. Mekândan ayrılarak check-in’i sonlandırabilir, cihaz veya tarayıcı ayarlarından konum iznini kapatabilirsiniz. Konum izni kapalıyken konum gerektiren özellikler çalışmayabilir.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Hizmet sağlayıcılar ve veri aktarımı</h2>
              <ul className="list-disc list-outside space-y-2 pl-5">
                <li><strong>Supabase</strong> hesap, veritabanı ve dosya altyapısını sağlar. Riyo’nun projesi Singapur bölgesindedir.</li>
                <li><strong>Vercel</strong> web uygulamasını barındırır ve sayfaları cihazınıza iletir.</li>
                <li><strong>Hostinger</strong> Litvanya’da şifreli kurtarma kopyalarının saklandığı sunucuyu sağlar.</li>
                <li><strong>Google</strong> seçtiğinizde Google ile giriş işlemini yürütür. Google Places, gerektiğinde yaklaşık konum alanına göre mekân sonuçları sağlar.</li>
                <li><strong>OpenAI</strong> izin verdiğiniz yeni profil fotoğrafını içerik güvenliği açısından değerlendirir.</li>
                <li><strong>OpenStreetMap</strong> aktivite haritasının görüntülenmesi için harita görsellerini sağlar. Harita açıldığında tarayıcınız ilgili harita alanı için bu hizmete istek gönderir.</li>
              </ul>
              <p className="mt-3">Bu altyapı nedeniyle bazı işlemler Türkiye dışında gerçekleşir. Veriler, geçerli bir yasal zorunluluk doğduğunda yetkili mercilerle de paylaşılabilir.</p>
              <p className="mt-3">Gönderdiğiniz mesajları ilgili sohbetin katılımcıları görebilir. Bir güvenlik bildirimi inceleme gerektirdiğinde, yetkili ekip bildirimin ve ilgili içeriğin gerekli kısmına erişebilir.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Saklama, yedekleme ve silme</h2>
              <div className="space-y-3">
                <p>Hesap verilerini ve fotoğrafları Supabase’de saklarız. Kesinti veya veri kaybı sonrası kurtarma için günlük şifreli kopyaları Hostinger sunucusunda tutarız. Veritabanı için 7 günlük ve 4 haftalık yedek saklarız. Profil fotoğrafları ve doğrulama selfieleri için ayrı bir 7 günlük yedek döngüsü kullanırız.</p>
                <p><Link to="/account-deletion" className="text-primary underline">Hesap ve veri silme</Link> işlemi hesabınızı, profilinizi, fotoğraflarınızı ve kendi gönderdiğiniz mesajları aktif sistemden kaldırır. Bazı moderasyon kayıtları sınırlı erişimle saklanabilir. Silinen verilerin önceki yedeklerdeki kopyaları yedek saklama döngüsü tamamlanana kadar kalabilir.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. Güvenlik ve tarayıcıda saklanan bilgiler</h2>
              <p>Riyo web bağlantısında HTTPS kullanır. Fotoğraf dosyalarına erişimi kullanıcı oturumu ve ilgili izinlerle sınırlandırır. Oturumunuzu sürdürmek ve bu cihazdaki bildirim tercihlerinizi hatırlamak için tarayıcıda bilgi saklar. Tarayıcı verilerini temizlediğinizde yeniden giriş yapmanız gerekebilir.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Haklarınız ve başvuru</h2>
              <p>KVKK’nın 11. maddesi kapsamında verilerinizin işlenip işlenmediğini, işleme amacını, amacına uygun kullanılıp kullanılmadığını ve hangi alıcılara aktarıldığını öğrenebilirsiniz. Eksik veya yanlış verilerin düzeltilmesini, koşulları oluştuğunda silinmesini veya yok edilmesini ve bu işlemlerin ilgili alıcılara bildirilmesini isteyebilirsiniz.</p>
              <p className="mt-3">Yalnızca otomatik analiz sonucunda aleyhinize bir sonuç çıkmasına itiraz edebilir ve hukuka aykırı işleme nedeniyle uğradığınız zararın giderilmesini talep edebilirsiniz.</p>
              <p className="mt-3">
                Veri talepleri ve fotoğraf denetimiyle ilgili itirazlar için <a href="mailto:support@cafemeet.com" className="text-primary underline">support@cafemeet.com</a> adresine yazabilirsiniz. Talebinizi ve ilgili hesabı belirtin. Kimliğinizi doğrulamak için ek bilgi gerekirse sizinle iletişime geçeriz.
              </p>
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
