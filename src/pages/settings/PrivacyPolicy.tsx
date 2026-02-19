import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';

export default function PrivacyPolicy() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Gizlilik Politikası" showBack />
        <main className="pt-16 px-4 max-w-lg mx-auto">
          {/* Title & Date */}
          <div className="py-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">CAFE MEET GİZLİLİK POLİTİKASI</h1>
            <p className="text-sm text-muted-foreground mt-2">Son Güncelleme Tarihi: 19 Şubat 2026</p>
          </div>

          {/* Veri Sorumlusu */}
          <div className="mb-8 p-4 rounded-xl bg-secondary/50">
            <h3 className="font-semibold text-foreground mb-1">Veri Sorumlusu</h3>
            <p className="text-sm text-foreground">UĞUR BİLGİN</p>
            <p className="text-sm text-foreground">
              İletişim: <a href="mailto:support@cafemeet.co" className="text-primary underline">support@cafemeet.co</a>
            </p>
          </div>

          <div className="space-y-8 text-sm text-foreground leading-relaxed">
            {/* 1. İşlenen Veriler */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. İşlenen Veriler</h2>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Profil bilgileri</li>
                <li>Fotoğraflar</li>
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

            {/* 3. Veri Güvenliği */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Veri Güvenliği</h2>
              <p className="mb-2">CafeMeet:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Şifreleme teknolojileri kullanır</li>
                <li>Yetkisiz erişimi engelleyen teknik önlemler alır</li>
              </ol>
            </section>

            {/* 4. Kullanıcı Hakları */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Kullanıcı Hakları</h2>
              <p className="mb-2">KVKK kapsamında:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Veriye erişim</li>
                <li>Düzeltme</li>
                <li>Silme</li>
                <li>İşlemeye itiraz</li>
              </ol>
              <p className="mt-3">
                haklarınızı <a href="mailto:support@cafemeet.co" className="text-primary underline">support@cafemeet.co</a> adresine iletebilirsiniz.
              </p>
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
