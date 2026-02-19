import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBlocking } from '@/hooks/useBlocking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, EyeOff, ShieldAlert, UserX, Loader2 } from 'lucide-react';

interface BlockedProfile {
  blockedId: string;
  name: string;
  photoUrl: string;
}

export default function SafetyPrivacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedUsers, unblockUser, loading: blockLoading } = useBlocking();
  const [isVisible, setIsVisible] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  // Fetch current visibility
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('is_visible')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsVisible(data.is_visible ?? true);
      });
  }, [user]);

  // Fetch blocked user profiles
  useEffect(() => {
    if (blockedUsers.length === 0) {
      setBlockedProfiles([]);
      setProfilesLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      const ids = blockedUsers.map(b => b.blockedId);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name, display_name, photo_url')
        .in('user_id', ids);

      if (data) {
        setBlockedProfiles(data.map(p => ({
          blockedId: p.user_id,
          name: p.display_name || p.name || 'Kullanıcı',
          photoUrl: p.photo_url || '',
        })));
      }
      setProfilesLoading(false);
    };

    fetchProfiles();
  }, [blockedUsers]);

  const handleVisibilityToggle = async (hidden: boolean) => {
    if (!user) return;
    setVisibilityLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ is_visible: !hidden })
      .eq('user_id', user.id);

    setVisibilityLoading(false);

    if (error) {
      toast.error('Ayar güncellenemedi');
      return;
    }

    setIsVisible(!hidden);
    toast.success(hidden ? 'Profiliniz gizlendi' : 'Profiliniz görünür');
  };

  const handleUnblock = async (blockedId: string) => {
    await unblockUser(blockedId);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Güvenlik & Gizlilik" showBack />

        <main className="pt-16 px-4 space-y-4">
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
                  {blockedUsers.length === 0
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
                        <img
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
