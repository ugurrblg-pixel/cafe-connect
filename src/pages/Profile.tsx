import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PurposeBadge } from '@/components/PurposeBadge';
import { PageLayout } from '@/components/PageLayout';
import { PremiumBadge } from '@/components/PremiumBadge';
import { ProfilePhotoCarousel } from '@/components/ProfilePhotoCarousel';
import { HobbyDisplay } from '@/components/HobbyDisplay';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { usePremium } from '@/hooks/usePremium';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import { Purpose } from '@/types';
import { Edit2, Shield, Bell, HelpCircle, LogOut, MessageCircle, Users, Heart, Eye, EyeOff, BellOff, BellRing, Loader2, Crown, ChevronRight, Zap, Trash2, ShieldCheck, Mail, Phone, User as UserIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { VerificationRequest } from '@/components/VerificationRequest';

interface Profile {
  id: string;
  name: string;
  display_name: string;
  age: number | null;
  bio: string;
  photo_url: string;
  photo_urls: string[];
  purpose: Purpose;
  allow_dms: boolean;
  is_visible: boolean;
  notifications_enabled: boolean;
  hobbies: string[];
  verification_status: string;
  phone: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, refreshProfile } = useAuth();
  const { isSubscribed, isSupported, permission, subscribe, unsubscribe } = useNotifications();
  const { isPremium } = usePremium();
  const { t, formatString } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (error) { console.error('Error fetching profile:', error); }
      else if (data) {
        setProfile({
          id: data.id, name: data.name || user.user_metadata?.name || 'Anonymous',
          display_name: data.display_name || '', age: data.age, bio: data.bio || '',
          photo_url: data.photo_url || '', photo_urls: (data.photo_urls as string[]) || [],
          purpose: data.purpose as Purpose, allow_dms: data.allow_dms,
          is_visible: data.is_visible ?? true, notifications_enabled: data.notifications_enabled ?? true,
          hobbies: (data.hobbies as string[]) || [], verification_status: data.verification_status || 'none',
          phone: (data as any).phone || null,
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const purposes: { value: Purpose; label: string; icon: React.ReactNode }[] = [
    { value: 'chat', label: t.intents.chat, icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'friendship', label: t.intents.friendship, icon: <Users className="w-4 h-4" /> },
    { value: 'dating', label: t.intents.dating, icon: <Heart className="w-4 h-4" /> },
  ];

  const handlePurposeChange = async (purpose: Purpose) => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ purpose }).eq('id', profile.id);
    if (error) { toast.error('Failed to update purpose'); return; }
    setProfile({ ...profile, purpose });
    toast.success(formatString(t.profile.purposeUpdated, { purpose }));
  };

  const handleDMToggle = async (enabled: boolean) => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ allow_dms: enabled }).eq('id', profile.id);
    if (error) { toast.error('Failed to update DM settings'); return; }
    setProfile({ ...profile, allow_dms: enabled });
    toast.success(enabled ? t.profile.dmEnabled : t.profile.dmDisabled);
  };

  const handleNotificationToggle = async () => {
    if (!profile) return;
    setNotificationLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        await supabase.from('profiles').update({ notifications_enabled: false }).eq('id', profile.id);
        setProfile({ ...profile, notifications_enabled: false });
      } else {
        await subscribe();
        await supabase.from('profiles').update({ notifications_enabled: true }).eq('id', profile.id);
        setProfile({ ...profile, notifications_enabled: true });
      }
    } finally { setNotificationLoading(false); }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleLogout = async () => { await signOut(); navigate('/auth'); };

  const handleDeleteAccount = async () => {
    if (!user || !profile) return;
    try {
      await Promise.all([
        supabase.from('profiles').update({ is_visible: false, bio: '[deleted]', display_name: 'Deleted User', photo_url: null, photo_urls: [] }).eq('user_id', user.id),
        supabase.from('conversations').update({ is_active: false }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase.from('check_ins').delete().eq('user_id', user.id),
      ]);
      await signOut();
      navigate('/auth');
      toast.success(t.profile.accountDeleted);
    } catch {
      toast.error(t.profile.accountDeleteFailed);
    }
  };

  const displayName = profile?.display_name || profile?.name || 'Anonymous';

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-background pb-24">
          <Header title={t.profile.title} showMenu />
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
        <Header title={t.profile.title} showMenu />

        <main className="pt-16 px-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-6 animate-scale-in">
          <ProfilePhotoCarousel photos={profile.photo_urls} avatarUrl={profile.photo_url} name={displayName} size="lg" className="mb-4" />
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{displayName}{profile.age ? `, ${profile.age}` : ''}</h1>
            {isPremium && <PremiumBadge size="sm" />}
          </div>
          <PurposeBadge purpose={profile.purpose} />
          <button onClick={() => navigate('/profile/edit')} className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
            <Edit2 className="w-4 h-4" />{t.profile.editProfile}
          </button>
        </div>

        {/* Premium Section */}
        <section className="card-elevated p-4 mb-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate('/subscription')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-secondary'}`}>
                <Crown className={`w-5 h-5 ${isPremium ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium text-foreground">{isPremium ? t.profile.premiumActive : 'CafeMeet Premium'}</p>
                <p className="text-sm text-muted-foreground">{isPremium ? t.profile.allFeaturesUnlocked : t.profile.unlimitedChatAndMore}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>

        {/* Boost Section */}
        <section className="card-elevated p-4 mb-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate('/boost')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t.profile.boost}</p>
                <p className="text-sm text-muted-foreground">{t.profile.standOutInCafes}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>

        {/* Profile Viewers */}
        <section className="card-elevated p-4 mb-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => navigate('/profile/viewers')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t.profile.profileViewers}</p>
                <p className="text-sm text-muted-foreground">{isPremium ? t.profile.seeWhoViewedYou : t.profile.premiumFeature}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </section>

        {/* Verification */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-3">{t.profile.accountVerification}</h2>
          <VerificationRequest verificationStatus={profile.verification_status} onStatusChange={(status) => setProfile({ ...profile, verification_status: status })} />
        </section>

        {/* Account Info - Only visible to the user */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Hesap Bilgileri
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Bu bilgiler sadece sana görünür.</p>
          <div className="space-y-3">
            {user?.email && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">E-posta</p>
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}
            {profile.phone ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p className="text-sm font-medium text-foreground truncate">{profile.phone}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p className="text-sm text-muted-foreground italic">Eklenmedi</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bio */}
        <section className="card-elevated p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">{t.profile.about}</h2>
            <button onClick={() => navigate('/profile/edit')} className="text-primary p-1"><Edit2 className="w-4 h-4" /></button>
          </div>
          <p className="text-muted-foreground">{profile.bio || t.profile.addBio}</p>
        </section>

        {/* Hobbies */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <section className="card-elevated p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">{t.profile.hobbies}</h2>
              <button onClick={() => navigate('/profile/edit')} className="text-primary p-1"><Edit2 className="w-4 h-4" /></button>
            </div>
            <HobbyDisplay hobbies={profile.hobbies} />
          </section>
        )}

        {/* Purpose Selection */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">{t.profile.imHereFor}</h2>
          <div className="flex gap-2">
            {purposes.map(({ value, label, icon }) => (
              <button key={value} onClick={() => handlePurposeChange(value)} className={`flex-1 py-3 px-3 rounded-xl flex flex-col items-center gap-2 transition-all ${profile.purpose === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Notification Settings */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">{t.profile.notificationSection}</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSubscribed ? 'bg-primary/10' : 'bg-secondary'}`}>
                {isSubscribed ? <BellRing className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-medium text-foreground">{t.profile.pushNotifications}</p>
                <p className="text-sm text-muted-foreground">
                  {!isSupported ? t.profile.browserNotSupport : permission === 'denied' ? t.profile.notificationsBlocked : isSubscribed ? t.profile.waveMatchNotifs : t.profile.enableNotifs}
                </p>
              </div>
            </div>
            {isSupported && permission !== 'denied' && (
              <Button variant={isSubscribed ? 'outline' : 'default'} size="sm" onClick={handleNotificationToggle} disabled={notificationLoading}>
                {notificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? t.profile.turnOff : t.profile.turnOn}
              </Button>
            )}
          </div>
        </section>


        {/* Settings Links */}
        <section className="card-elevated overflow-hidden">
          {[
            { icon: Shield, label: t.profile.safetyPrivacy, color: 'text-accent', onClick: () => navigate('/settings/safety') },
            { icon: Bell, label: t.profile.notificationsLink, color: 'text-primary', onClick: () => navigate('/settings/notifications') },
            { icon: HelpCircle, label: t.profile.helpSupport, color: 'text-muted-foreground', onClick: () => navigate('/settings/help') },
            { icon: LogOut, label: t.profile.signOutLink, color: 'text-destructive', onClick: handleLogout },
            { icon: Trash2, label: t.profile.deleteAccount, color: 'text-destructive', onClick: () => setShowDeleteDialog(true) },
          ].map(({ icon: Icon, label, color, onClick }) => (
            <button key={label} onClick={onClick} className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="font-medium text-foreground">{label}</span>
              {label !== t.profile.signOutLink && label !== t.profile.deleteAccount && (
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              )}
            </button>
          ))}
        </section>

        <DeleteAccountDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={handleDeleteAccount} />
      </main>
      </div>
    </PageLayout>
  );
}
