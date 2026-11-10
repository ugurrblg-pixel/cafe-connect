import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';

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
            <h3 className="font-semibold text-foreground mb-1">Veri Sorumlusu</h3>
            <p className="text-sm text-foreground">UĞUR BİLGİN</p>
            <p className="text-sm text-foreground">
              İletişim: <a href="mailto:support@cafemeet.com" className="text-primary underline">support@cafemeet.com</a>
            </p>
          </div>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">
            {/* 1. İşlenen Veriler */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. İşlenen Veriler</h2>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Profil bilgileri</li>
                <li>Profil fotoğrafları ve doğrulama başvurusu yaparsanız doğrulama selfieniz</li>
                <li>Konum verisi</li>
                <li>Mesaj içerikleri</li>
                <li>IP adresi</li>
                <li>Cihaz bilgileri</li>
              </ol>
            </section>

            {/* 2. Veri İşleme Amaçları */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Veri İşleme Amaçları</h2>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Eşleşme sağlamak</li>
                <li>Güvenliği artırmak</li>
                <li>Sahte hesapları önlemek</li>
                <li>Hizmeti geliştirmek</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Fotoğraflar ve hesap doğrulama</h2>
              <div className="space-y-3">
                <p>Yeni profil fotoğrafı yüklerken verdiğiniz izinle fotoğraf, cinsel içerik, şiddet ve kendine zarar içeriği açısından denetlenmek üzere OpenAI’a gönderilir. Denetimden geçmeyen veya denetimi tamamlanamayan yeni fotoğraflar profilinize eklenmez.</p>
                <p>Hesap doğrulaması isteğe bağlıdır. Başvurunuz beklemedeyken yetkili Riyo ekibi, gönderdiğiniz selfie ile başvuru anındaki ana profil fotoğrafınızı ilk 7 gün içinde karşılaştırabilir. Selfie diğer kullanıcılara gösterilmez ve otomatik profil fotoğrafı denetimine gönderilmez.</p>
                <p>Aynı mekânda aktif check-in yapan kişiler, gizlilik ve engelleme ayarları izin verdiğinde sınırlı profil bilgilerinizi ve onaylı profil fotoğraflarınızı görebilir.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Saklama, yedekleme ve silme</h2>
              <div className="space-y-3">
                <p>Hesap verilerini ve fotoğrafları Supabase’de saklarız. Kesinti veya veri kaybı sonrası kurtarma için günlük şifreli kopyaları Hostinger sunucusunda tutarız. Veritabanı için 7 günlük ve 4 haftalık yedek saklarız. Profil fotoğrafları ve doğrulama selfieleri için ayrı bir 7 günlük yedek döngüsü kullanırız.</p>
                <p>Hesap silme işlemi hesabınızı, profilinizi, fotoğraflarınızı ve kendi gönderdiğiniz mesajları aktif sistemden kaldırır. Bazı moderasyon kayıtları sınırlı erişimle saklanabilir. Silinen verilerin önceki yedeklerdeki kopyaları yedek saklama döngüsü tamamlanana kadar kalabilir.</p>
              </div>
            </section>

            {/* 5. Veri Güvenliği */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Veri Güvenliği</h2>
              <p className="mb-2">Riyo:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Şifreleme teknolojileri kullanır</li>
                <li>Yetkisiz erişimi engelleyen teknik önlemler alır</li>
              </ol>
            </section>

            {/* 6. Kullanıcı Hakları */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Kullanıcı Hakları</h2>
              <p className="mb-2">KVKK kapsamında:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Veriye erişim</li>
                <li>Düzeltme</li>
                <li>Silme</li>
                <li>İşlemeye itiraz</li>
              </ol>
              <p className="mt-3">
                haklarınızı <a href="mailto:support@cafemeet.com" className="text-primary underline">support@cafemeet.com</a> adresine iletebilirsiniz.
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
