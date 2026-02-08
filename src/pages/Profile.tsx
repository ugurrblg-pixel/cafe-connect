import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PurposeBadge } from '@/components/PurposeBadge';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { PageLayout } from '@/components/PageLayout';
import { PremiumBadge } from '@/components/PremiumBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Purpose } from '@/types';
import { Edit2, Shield, Bell, HelpCircle, LogOut, MessageCircle, Users, Heart, Eye, EyeOff, BellOff, BellRing, Loader2, Crown, ChevronRight, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Profile {
  id: string;
  name: string;
  display_name: string;
  age: number | null;
  bio: string;
  photo_url: string;
  purpose: Purpose;
  allow_dms: boolean;
  is_visible: boolean;
  notifications_enabled: boolean;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, refreshProfile } = useAuth();
  const { isSubscribed, isSupported, permission, subscribe, unsubscribe } = useNotifications();
  const { isPremium } = usePremium();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile({
          id: data.id,
          name: data.name || user.user_metadata?.name || 'Anonymous',
          display_name: data.display_name || '',
          age: data.age,
          bio: data.bio || '',
          photo_url: data.photo_url || '',
          purpose: data.purpose as Purpose,
          allow_dms: data.allow_dms,
          is_visible: data.is_visible ?? true,
          notifications_enabled: data.notifications_enabled ?? true,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const purposes: { value: Purpose; label: string; icon: React.ReactNode }[] = [
    { value: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'friendship', label: 'Friendship', icon: <Users className="w-4 h-4" /> },
    { value: 'dating', label: 'Dating', icon: <Heart className="w-4 h-4" /> },
  ];

  const handlePurposeChange = async (purpose: Purpose) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ purpose })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update purpose');
      return;
    }

    setProfile({ ...profile, purpose });
    toast.success(`Purpose updated to ${purpose}`);
  };

  const handleDMToggle = async (enabled: boolean) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ allow_dms: enabled })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update DM settings');
      return;
    }

    setProfile({ ...profile, allow_dms: enabled });
    toast.success(enabled ? 'Direct messages enabled' : 'Direct messages disabled');
  };

  const handleNotificationToggle = async () => {
    if (!profile) return;
    setNotificationLoading(true);
    
    try {
      if (isSubscribed) {
        // Unsubscribe from browser push AND update DB preference
        await unsubscribe();
        await supabase.from('profiles').update({ notifications_enabled: false }).eq('id', profile.id);
        setProfile({ ...profile, notifications_enabled: false });
      } else {
        // Subscribe to browser push AND update DB preference
        await subscribe();
        await supabase.from('profiles').update({ notifications_enabled: true }).eq('id', profile.id);
        setProfile({ ...profile, notifications_enabled: true });
      }
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.display_name || profile?.name || 'Anonymous';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-background pb-24">
          <Header title="Profile" showMenu />
          <main className="pt-16 px-4">
            <div className="flex flex-col items-center py-6">
              <Skeleton className="w-28 h-28 rounded-full mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          </main>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Profile" showMenu />

        <main className="pt-16 px-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-6 animate-scale-in">
          <div className="relative mb-4">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={displayName}
                className="w-28 h-28 rounded-full object-cover border-4 border-card shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center border-4 border-card shadow-lg">
                <span className="text-3xl font-bold text-primary-foreground">
                  {getInitials(displayName)}
                </span>
              </div>
            )}
            {/* Visibility indicator */}
            <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-card ${profile.is_visible ? 'bg-accent' : 'bg-muted'}`}>
              {profile.is_visible ? (
                <Eye className="w-4 h-4 text-accent-foreground" />
              ) : (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              {displayName}{profile.age ? `, ${profile.age}` : ''}
            </h1>
            {isPremium && <PremiumBadge size="sm" />}
          </div>
          <PurposeBadge purpose={profile.purpose} />
          <button
            onClick={() => navigate('/profile/edit')}
            className="mt-3 flex items-center gap-2 text-primary text-sm font-medium"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* Premium Section */}
        <section 
          className="card-elevated p-4 mb-4 cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={() => navigate('/subscription')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isPremium 
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                  : 'bg-secondary'
              }`}>
                <Crown className={`w-5 h-5 ${isPremium ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {isPremium ? 'Premium Aktif' : 'Premium\'a Geç'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPremium ? 'Tüm özellikler açık' : 'Sınırsız sohbet ve daha fazlası'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>

        {/* Boost Section */}
        <section 
          className="card-elevated p-4 mb-4 cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={() => navigate('/boost')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <p className="font-medium text-foreground">Boost</p>
                <p className="text-sm text-muted-foreground">Kafede öne çık</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>

        {/* Profile Viewers - Premium feature */}
        <section 
          className="card-elevated p-4 mb-4 cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={() => navigate('/profile/viewers')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Profil Görüntüleyenler</p>
                <p className="text-sm text-muted-foreground">
                  {isPremium ? 'Seni kimlerin görüntülediğini gör' : 'Premium özellik'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>

        {/* Bio Section */}
        <section className="card-elevated p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">About</h2>
            <button onClick={() => navigate('/profile/edit')} className="text-primary p-1">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-muted-foreground">{profile.bio || 'Add a bio to tell others about yourself'}</p>
        </section>

        {/* Purpose Selection */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">I'm here for</h2>
          <div className="flex gap-2">
            {purposes.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handlePurposeChange(value)}
                className={`flex-1 py-3 px-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                  profile.purpose === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Notification Settings */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">Bildirimler</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSubscribed ? 'bg-primary/10' : 'bg-secondary'}`}>
                {isSubscribed ? (
                  <BellRing className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">Push Bildirimleri</p>
                <p className="text-sm text-muted-foreground">
                  {!isSupported 
                    ? 'Tarayıcınız desteklemiyor'
                    : permission === 'denied'
                    ? 'Bildirimler engellendi'
                    : isSubscribed 
                    ? 'Wave, match ve mesaj bildirimleri alın'
                    : 'Bildirimleri aktif edin'
                  }
                </p>
              </div>
            </div>
            {isSupported && permission !== 'denied' && (
              <Button
                variant={isSubscribed ? 'outline' : 'default'}
                size="sm"
                onClick={handleNotificationToggle}
                disabled={notificationLoading}
              >
                {notificationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSubscribed ? (
                  'Kapat'
                ) : (
                  'Aç'
                )}
              </Button>
            )}
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">Gizlilik</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Mesajlara İzin Ver</p>
                <p className="text-sm text-muted-foreground">Diğerlerinin size mesaj atmasına izin verin</p>
              </div>
            </div>
            <Switch checked={profile.allow_dms} onCheckedChange={handleDMToggle} />
          </div>
        </section>

        {/* Settings Links */}
        <section className="card-elevated overflow-hidden">
          {[
            { icon: Shield, label: 'Safety & Privacy', color: 'text-accent', onClick: () => {} },
            { icon: Bell, label: 'Notifications', color: 'text-primary', onClick: () => {} },
            { icon: HelpCircle, label: 'Help & Support', color: 'text-muted-foreground', onClick: () => {} },
            { icon: LogOut, label: 'Log Out', color: 'text-destructive', onClick: handleLogout },
          ].map(({ icon: Icon, label, color, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="font-medium text-foreground">{label}</span>
            </button>
          ))}
        </section>
      </main>
      </div>
    </PageLayout>
  );
}
