import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { HobbySelector } from '@/components/HobbySelector';
import { ProfilePhotoManager } from '@/components/ProfilePhotoManager';
import { Loader2, MessageCircle, Users, Heart, Camera, Pencil, Compass, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Purpose } from '@/types';
import { containsProfanity, getProfanityError } from '@/lib/profanityFilter';

interface ProfileData {
  id: string;
  display_name: string;
  bio: string;
  photo_url: string;
  photo_urls: string[];
  is_visible: boolean;
  purpose: Purpose;
  hobbies: string[];
}

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    display_name: '',
    bio: '',
    photo_url: '',
    photo_urls: [],
    is_visible: true,
    purpose: 'friendship',
    hobbies: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, photo_url, photo_urls, is_visible, purpose, hobbies')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Profil yüklenemedi');
      } else if (data) {
        setProfile({
          id: data.id,
          display_name: data.display_name || '',
          bio: data.bio || '',
          photo_url: data.photo_url || '',
          photo_urls: (data.photo_urls as string[]) || [],
          is_visible: data.is_visible ?? true,
          purpose: (data.purpose as Purpose) || 'friendship',
          hobbies: (data.hobbies as string[]) || [],
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile.id) return;

    const trimmedName = profile.display_name.trim();
    if (!trimmedName) { toast.error('İsim zorunludur'); return; }
    if (trimmedName.length > 50) { toast.error('İsim en fazla 50 karakter olabilir'); return; }
    if (containsProfanity(trimmedName)) { toast.error(getProfanityError()); return; }

    const trimmedBio = profile.bio.trim();
    if (trimmedBio.length > 120) { toast.error('Bio en fazla 120 karakter olabilir'); return; }
    if (containsProfanity(trimmedBio)) { toast.error(getProfanityError()); return; }

    setSaving(true);
    const mainPhotoUrl = profile.photo_urls.length > 0 ? profile.photo_urls[0] : profile.photo_url;

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: trimmedName,
        bio: trimmedBio,
        photo_url: mainPhotoUrl,
        photo_urls: profile.photo_urls,
        is_visible: profile.is_visible,
        purpose: profile.purpose,
        hobbies: profile.hobbies,
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Error saving profile:', error);
      toast.error('Profil kaydedilemedi');
    } else {
      toast.success('Profil kaydedildi!');
      navigate('/profile');
    }
    setSaving(false);
  };

  // Completion calculation
  const completionSteps = [
    { label: 'Fotoğraf', done: profile.photo_urls.length > 0 || !!profile.photo_url },
    { label: 'İsim', done: !!profile.display_name.trim() },
    { label: 'Bio', done: !!profile.bio.trim() },
    { label: 'Hobiler', done: profile.hobbies.length > 0 },
  ];
  const completionCount = completionSteps.filter(s => s.done).length;
  const completionPercent = Math.round((completionCount / completionSteps.length) * 100);

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-background pb-24">
          <Header title="Profili Düzenle" showBack />
          <main className="pt-20 px-4">
            <div className="flex flex-col items-center py-6">
              <Skeleton className="w-28 h-28 rounded-full mb-6" />
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </main>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Profili Düzenle" showBack />

        <main className="pt-16 px-4 pb-24 space-y-4">

          {/* Completion Banner */}
          {completionPercent < 100 && (
            <section className="card-elevated p-4 mt-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Profilin %{completionPercent} tamamlandı
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tamamlanmış profiller daha fazla etkileşim alır
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              {/* Missing steps */}
              <div className="flex flex-wrap gap-2 mt-3">
                {completionSteps.filter(s => !s.done).map(s => (
                  <span key={s.label} className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">
                    {s.label} eksik
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Photos Section */}
          <section className="card-elevated p-4">
            <SectionHeader icon={Camera} title="Fotoğraflar" subtitle="İlk fotoğrafın profil resmin olur" />
            <div className="mt-3">
              <ProfilePhotoManager
                photos={profile.photo_urls.length > 0 ? profile.photo_urls : (profile.photo_url ? [profile.photo_url] : [])}
                onPhotosChange={(photos) => setProfile(prev => ({ ...prev, photo_urls: photos }))}
              />
            </div>
          </section>

          {/* Basic Info Section */}
          <section className="card-elevated p-4">
            <SectionHeader icon={Pencil} title="Temel Bilgiler" subtitle="Seni tanıtan bilgiler" />
            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-medium">Görünen İsim</Label>
                <Input
                  id="display_name"
                  value={profile.display_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="İsminiz nasıl görünsün?"
                  maxLength={50}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground text-right">{profile.display_name.length}/50</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">Hakkında</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Kendinizden biraz bahsedin... ☕"
                  maxLength={120}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/120</p>
              </div>
            </div>
          </section>

          {/* Purpose Section */}
          <section className="card-elevated p-4">
            <SectionHeader icon={Compass} title="Ne arıyorsun?" subtitle="Niyetini göster, doğru kişilerle eşleş" />
            <div className="mt-4">
              <ToggleGroup
                type="single"
                value={profile.purpose}
                onValueChange={(value) => {
                  if (value) setProfile(prev => ({ ...prev, purpose: value as Purpose }));
                }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: 'friendship', icon: Users, label: 'Arkadaşlık', emoji: '🤝' },
                  { value: 'dating', icon: Heart, label: 'Flört', emoji: '💕' },
                  { value: 'chat', icon: MessageCircle, label: 'Sohbet', emoji: '💬' },
                ].map(({ value, icon: Icon, label, emoji }) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    className="flex flex-col items-center gap-1.5 py-4 px-2 h-auto rounded-xl border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all"
                  >
                    <span className="text-lg">{emoji}</span>
                    <span className="text-xs font-semibold">{label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </section>

          {/* Hobbies Section */}
          <section className="card-elevated p-4">
            <SectionHeader icon={Heart} title="İlgi Alanları" subtitle="Ortak hobiler eşleşmelere yardımcı olur" />
            <div className="mt-4">
              <HobbySelector
                selectedHobbies={profile.hobbies}
                onHobbiesChange={(hobbies) => setProfile(prev => ({ ...prev, hobbies }))}
              />
            </div>
          </section>

          {/* Save Button */}
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !profile.display_name.trim()}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Profili Kaydet'
              )}
            </Button>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}

/* Reusable section header */
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
