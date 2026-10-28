import { PrivateProfileImage } from '@/components/PrivateProfileImage';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBlocking } from '@/hooks/useBlocking';
import { MapPin, EyeOff, ShieldAlert, UserX, Loader2 } from 'lucide-react';
import { useProfileVisibility } from '@/hooks/useProfileVisibility';

interface BlockedProfile {
  blockedId: string;
  name: string;
  photoUrl: string;
}

export default function SafetyPrivacy() {
  const { user } = useAuth();
  const { blockedUsers, unblockUser, loading: blockLoading, listLoading: profilesLoading, listError } = useBlocking();
  const visibility = useProfileVisibility();
  const blockedProfiles: BlockedProfile[] = blockedUsers.map((block, index) => ({ blockedId: block.blockedId, name: `Kullanıcı ${index + 1} · ${block.createdAt.toLocaleDateString('tr-TR')}`, photoUrl: '' }));


  const handleUnblock = async (blockedId: string) => {
    await unblockUser(blockedId);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Güvenlik & Gizlilik" showBack />

        <main className="pt-20 px-5 space-y-4">
          <section className="card-elevated p-4" aria-labelledby="profile-visibility-title">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <EyeOff aria-hidden="true" className="h-5 w-5 shrink-0 text-accent mt-1"/>
                <div><h3 id="profile-visibility-title" className="font-semibold">Profil görünürlüğü</h3>
                <label htmlFor="hide-profile" className="block mt-2 text-sm font-medium">Profilimi gizle</label>
                <p id="hide-profile-help" className="mt-1 text-sm text-muted-foreground">Açtığında mekân katılımcılarından ve yeni tanışmalardan gizlenirsin. Mesajlaşman da kapanır. Mevcut check-in süren devam eder; tekrar görünür olmak için bu ayarı kapatabilirsin.</p></div>
              </div>
              <Switch id="hide-profile" className="shrink-0 mt-2" checked={visibility.visible===false} disabled={visibility.loading||visibility.saving||visibility.error||!user} onCheckedChange={hidden=>void visibility.save(!hidden)} aria-describedby="hide-profile-help"/>
            </div>
            {visibility.loading&&<p role="status" className="mt-3 text-xs text-muted-foreground">Görünürlük ayarın yükleniyor…</p>}
            {visibility.saving&&<p role="status" className="mt-3 text-xs text-muted-foreground">Kaydediliyor…</p>}
            {visibility.error&&<div role="alert" className="mt-3 text-sm"><p>Görünürlük ayarın yüklenemedi.</p><Button variant="outline" size="sm" className="mt-2" onClick={()=>void visibility.reload()}>Tekrar dene</Button></div>}
          </section>
          {/* Location Info Card */}
          <section className="card-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Konum Kullanımı</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Konumun yalnızca yakındaki kafeleri göstermek ve check-in sırasında kullanılır. Arka planda sürekli takip edilmez.
                </p>
              </div>
            </div>
          </section>


          {/* Blocked Users */}
          <section className="card-elevated p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Engellenen Kullanıcılar</h3>
                <p className="text-sm text-muted-foreground">
                  {listError ? 'Engel listesi yüklenemedi. Sayfayı yenileyin.' : blockedUsers.length === 0
                    ? 'Engellediğiniz kimse yok'
                    : `${blockedUsers.length} kullanıcı engelli`}
                </p>
              </div>
            </div>

            {profilesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {blockedProfiles.map((bp) => (
                  <div key={bp.blockedId} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div className="flex items-center gap-3">
                      {bp.photoUrl ? (
                        <PrivateProfileImage
                          src={bp.photoUrl}
                          alt={bp.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-muted-foreground">
                          {getInitials(bp.name)}
                        </div>
                      )}
                      <span className="font-medium text-foreground">{bp.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(bp.blockedId)}
                      disabled={blockLoading}
                    >
                      Engeli Kaldır
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Report a User */}
          <section className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Bir Kullanıcıyı Şikayet Et</h3>
                <p className="text-sm text-muted-foreground">
                  Uygunsuz davranışı güvenlik ekibimize bildirin
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Bir kullanıcının profilindeki menüden veya sohbet ekranından şikayet edebilirsiniz.
            </p>
          </section>
        </main>
      </div>
    </PageLayout>
  );
}
