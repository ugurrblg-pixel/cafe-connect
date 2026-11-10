import { Link } from 'react-router-dom';
import { AccountDeletionSection } from '@/components/AccountDeletionSection';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { useAuth } from '@/contexts/AuthContext';

const support = 'support@cafemeet.com';

export default function LegalHelp({ page }: { page: 'community' | 'deletion' }) {
  const { user } = useAuth();
  const deletion = page === 'deletion';
  const title = deletion ? 'Hesap ve veri silme' : 'Topluluk Kuralları';

  return (
    <PageLayout>
      <Header title={title} showBack />
      <main className="px-5 pb-24 pt-24 text-sm leading-relaxed text-foreground">
        {deletion ? (
          <div className="space-y-5">
            <p>Riyo hesabınızı web tarayıcısından silebilirsiniz. İşlem profilinizi, fotoğraflarınızı ve kendi gönderdiğiniz mesajları aktif sistemden kaldırır.</p>
            {user ? <AccountDeletionSection key={user.id} /> : (
              <p><Link to="/auth" className="font-medium text-primary underline">Riyo hesabınıza giriş yapın</Link> ve profil sayfasında <strong>Hesabımı sil</strong> seçeneğini açın.</p>
            )}
            <p>Hesabınıza erişemiyorsanız <a href={`mailto:${support}?subject=Riyo%20hesap%20silme%20talebi`} className="text-primary underline">hesap silme talebinizi e-postayla başlatın</a>. Hesabınıza ait e-posta adresini belirtin. Destek ekibi işlemi yürütmeden önce hesabın size ait olduğunu doğrulayabilir.</p>
            <p>Bazı moderasyon kayıtları sınırlı erişimle saklanabilir. Önceki şifreli kopyalar saklama döngüsü sonunda kaldırılır. Ayrıntılar için <Link to="/settings/help/privacy-policy" className="text-primary underline">Gizlilik Politikası</Link> sayfasına bakın.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-base font-semibold">Saygılı ve güvenli iletişim</h2>
              <p>Riyo 18 yaş ve üzeri kişilere açıktır. Taciz, tehdit, ısrarlı takip, nefret söylemi, cinsel istismar, izinsiz mahrem içerik paylaşımı, sahte profil, dolandırıcılık ve spam yasaktır. Bu kurallar profil, fotoğraf, mesaj ve aktivitelere uygulanır.</p>
            </section>
            <section>
              <h2 className="mb-2 text-base font-semibold">Bildir ve engelle</h2>
              <p>İlgili profilin menüsünde şikâyet etme veya engelleme seçeneğini kullanın. Uygulama içinden bildiremiyorsanız <a href={`mailto:${support}`} className="text-primary underline">{support}</a> adresine olayın kısa açıklamasını gönderin. Riyo ekibi bildirimi inceleyebilir ve ihlale göre erişimi kısıtlayabilir.</p>
            </section>
            <section>
              <h2 className="mb-2 text-base font-semibold">Karara itiraz</h2>
              <p>Hesabınız askıya alındıysa veya bir moderasyon kararına itiraz etmek istiyorsanız <a href={`mailto:${support}?subject=Riyo%20moderasyon%20itirazi`} className="text-primary underline">destek ekibine yazın</a>. İlgili hesabı, kararı ve itiraz nedeninizi belirtin.</p>
            </section>
          </div>
        )}
      </main>
    </PageLayout>
  );
}
