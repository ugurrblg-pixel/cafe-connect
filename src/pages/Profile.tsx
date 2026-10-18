import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { PurposeBadge } from '@/components/PurposeBadge';
import { PremiumBadge } from '@/components/PremiumBadge';
import { ProfilePhotoCarousel } from '@/components/ProfilePhotoCarousel';
import { HobbyDisplay } from '@/components/HobbyDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import { Purpose } from '@/types';
import { Edit2, Shield, HelpCircle, LogOut, MessageCircle, Users, Heart, Crown, ChevronRight, Mail, Phone, User as UserIcon, CalendarDays, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationRequest } from '@/components/VerificationRequest';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { AccountDeletionSection } from '@/components/AccountDeletionSection';

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
  date_of_birth: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const { t, formatString } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purposeSaving, setPurposeSaving] = useState(false);
  const completion = useProfileCompletion();

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
          date_of_birth: (data as any).date_of_birth || null,
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
    if (!profile || purposeSaving || purpose === profile.purpose) return;
    setPurposeSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ purpose }).eq('id', profile.id);
      if (error) throw error;
      setProfile(previous => previous ? { ...previous, purpose } : previous);
      await refreshProfile();
      toast.success('Tanışma amacın güncellendi');
    } catch { toast.error('Amaç kaydedilemedi. Tekrar deneyebilirsin.'); }
    finally { setPurposeSaving(false); }
  };

  const handleLogout = async () => {
    try { await signOut(); navigate('/auth'); }
    catch { toast.error('Çıkış yapılamadı. Tekrar deneyebilirsin.'); }
  };

  const displayName = profile?.display_name || profile?.name || 'Anonymous';

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-background pb-24">
          <main className="pt-6 px-4">
            <div className="flex flex-col items-center py-10">
              <Skeleton className="w-28 h-28 rounded-full mb-4" />
              <Skeleton className="h-7 w-36 mb-2 rounded-xl" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </main>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6"><p className="text-muted-foreground">Profil bilgilerin yüklenemedi.</p><button onClick={() => window.location.reload()} className="mt-3 text-sm font-semibold text-primary">Tekrar dene</button></div>
      </div>
    );
  }

  const cardClass = "bg-card rounded-3xl p-5 mb-4 border border-border/60";
  const cardShadow = { boxShadow: '0 2px 16px -2px hsl(18 30% 50% / 0.07)' };

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* No Header — clean profile-first layout */}
        <main className="pt-6 px-4 max-w-2xl mx-auto">

          {/* Profile Hero */}
          <div className="relative p-6 mb-6 rounded-[32px] border border-primary/10 bg-card overflow-hidden animate-scale-in">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-primary/20 via-rose-100 to-amber-100" aria-hidden="true" />
            <div className="relative flex items-end justify-between gap-4 pt-6 mb-5">
            <div className="relative ring-4 ring-card rounded-2xl">
              <ProfilePhotoCarousel
                photos={profile.photo_urls}
                avatarUrl={profile.photo_url}
                name={displayName}
                size="md"
              />
              {isPremium && (
                <div className="absolute -bottom-1 -right-1">
                  <PremiumBadge size="sm" />
                </div>
              )}
            </div>

            <button onClick={() => navigate('/profile/edit')} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"><Edit2 className="w-3.5 h-3.5" />{t.profile.editProfile}</button>
            </div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary mb-2">Burası senin köşen</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {displayName}{profile.age ? `, ${profile.age}` : ''}
            </h1>

            <PurposeBadge purpose={profile.purpose} size="sm" />
            {profile.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-md">{profile.bio}</p>}

            <div className="grid grid-cols-2 gap-3 mt-5 border-t border-border pt-4"><div><p className="text-lg font-bold">{profile.photo_urls.filter(Boolean).length}</p><p className="text-xs text-muted-foreground">Fotoğrafın</p></div><div><p className="text-lg font-bold">{profile.hobbies.length}</p><p className="text-xs text-muted-foreground">İlgi alanın</p></div></div>
          </div>

          <section className={cardClass} style={cardShadow}>
            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Profilini tamamla</h2><span className="text-sm font-bold text-primary">%{completion.percentage}</span></div>
            <div role="progressbar" aria-label="Profil tamamlama" aria-valuenow={completion.percentage} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width: `${completion.percentage}%`}} /></div>
            <p className="text-xs text-muted-foreground mt-3">{completion.missingFields.length ? `${completion.missingFields.join(', ')} ekleyerek kendini daha iyi anlatabilirsin.` : 'Temel profil bilgilerin tamam. Yeni bir sohbete hazırsın.'}</p>
            <button onClick={() => navigate('/profile/edit')} className="mt-3 text-sm text-primary font-semibold">Profil bilgilerimi düzenle →</button>
          </section>

          {/* Bio */}
          <div className={cardClass} style={cardShadow}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-foreground">{t.profile.about}</h2>
              <button onClick={() => navigate('/profile/edit')} aria-label="Profil bilgilerini düzenle" className="text-primary p-1 rounded-full hover:bg-primary/10 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{profile.bio || t.profile.addBio}</p>
          </div>

          {/* Hobbies */}
          {(
            <div className={cardClass} style={cardShadow}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-foreground">{t.profile.hobbies}</h2>
                <button onClick={() => navigate('/profile/edit')} aria-label="Profil bilgilerini düzenle" className="text-primary p-1 rounded-full hover:bg-primary/10 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <HobbyDisplay hobbies={profile.hobbies} />
              {profile.hobbies.length === 0 && <button onClick={() => navigate('/profile/edit')} className="text-sm text-muted-foreground text-left">Sevdiğin şeyleri ekle; ortak ilgi alanların sohbet başlatmayı kolaylaştırır. <span className="text-primary">İlgi alanı ekle →</span></button>}
            </div>
          )}

          {/* Purpose Selection */}
          <div className={cardClass} style={cardShadow}>
            <h2 className="font-semibold text-foreground mb-3">{t.profile.imHereFor}</h2>
            <div className="flex gap-2">
              {purposes.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => handlePurposeChange(value)}
                  disabled={purposeSaving}
                  aria-pressed={profile.purpose === value}
                  className={`flex-1 py-3 px-3 rounded-2xl flex flex-col items-center gap-2 transition-all ${
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
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 mt-6">Hesabın ve güvenliğin</h2>
          {/* Verification */}
          <div className={cardClass} style={cardShadow}>
            <h2 className="font-semibold text-foreground mb-3">{t.profile.accountVerification}</h2>
            <VerificationRequest
              verificationStatus={profile.verification_status}
              onStatusChange={(status) => setProfile({ ...profile, verification_status: status })}
            />
          </div>

          {/* Account Info */}
          <div className={cardClass} style={cardShadow}>
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p className={`text-sm ${profile.phone ? 'font-medium text-foreground' : 'text-muted-foreground italic'}`}>
                    {profile.phone || 'Eklenmedi'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Doğum Tarihi</p>
                  <p className={`text-sm ${profile.date_of_birth ? 'font-medium text-foreground' : 'text-muted-foreground italic'}`}>
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Eklenmedi'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Links */}
          <div className="bg-card rounded-3xl overflow-hidden mb-4 border border-border/60" style={cardShadow}>
            {[
              { icon: Shield, label: t.profile.safetyPrivacy, color: 'text-accent', onClick: () => navigate('/settings/safety') },
              { icon: Bell, label: 'Bildirim ayarları', color: 'text-primary', onClick: () => navigate('/settings/notifications') },
              { icon: HelpCircle, label: t.profile.helpSupport, color: 'text-muted-foreground', onClick: () => navigate('/settings/help') },
            ].map(({ icon: Icon, label, color, onClick }) => (
              <button key={label} onClick={onClick} className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/40 transition-colors border-b border-border/40 last:border-b-0">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="font-medium text-foreground text-sm">{label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>

          <section className={cardClass} style={cardShadow}>
            <div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-amber-50"><Crown className="w-5 h-5 text-amber-600" /></div><div><h2 className="font-semibold">Riyo'da daha fazlası</h2><p className="text-xs text-muted-foreground mt-1">Premium, Boost ve profil ziyaretleri henüz kullanılamıyor.</p></div></div>
          </section>

          {/* Danger Zone */}
          <div className="bg-card rounded-[20px] overflow-hidden mb-6 border-0" style={cardShadow}>
            <button onClick={handleLogout} className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/40 transition-colors border-b border-border/40">
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="font-medium text-destructive text-sm">{t.profile.signOutLink}</span>
            </button>
            <AccountDeletionSection key={user?.id}/>
          </div>


        </main>
      </div>
    </PageLayout>
  );
}
