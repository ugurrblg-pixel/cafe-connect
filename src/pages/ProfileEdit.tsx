import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { HobbySelector } from '@/components/HobbySelector';
import { ProfilePhotoManager } from '@/components/ProfilePhotoManager';
import { User, Loader2, MessageCircle, Users, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Purpose } from '@/types';

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
        toast.error('Failed to load profile');
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

  // Sync photo_urls with legacy photo_url field
  const getMainPhotoUrl = () => {
    return profile.photo_urls.length > 0 ? profile.photo_urls[0] : profile.photo_url;
  };

  const handleSave = async () => {
    if (!user || !profile.id) return;

    // Validate display name
    const trimmedName = profile.display_name.trim();
    if (!trimmedName) {
      toast.error('Display name is required');
      return;
    }

    if (trimmedName.length > 50) {
      toast.error('Display name must be 50 characters or less');
      return;
    }

    // Validate bio
    const trimmedBio = profile.bio.trim();
    if (trimmedBio.length > 120) {
      toast.error('Bio must be 120 characters or less');
      return;
    }

    setSaving(true);

    // Use first photo from photo_urls as main photo_url for backwards compatibility
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
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile saved!');
      navigate('/profile');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Edit Profile" showBack />
        <main className="pt-20 px-4">
          <div className="flex flex-col items-center py-6">
            <Skeleton className="w-28 h-28 rounded-full mb-6" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profili Düzenle" showBack />

      <main className="pt-20 px-4 pb-24">
        {/* Profile Photos Section */}
        <div className="py-6">
          <ProfilePhotoManager
            photos={profile.photo_urls.length > 0 ? profile.photo_urls : (profile.photo_url ? [profile.photo_url] : [])}
            onPhotosChange={(photos) => setProfile(prev => ({ ...prev, photo_urls: photos }))}
          />
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display_name">Görünen İsim</Label>
            <Input
              id="display_name"
              value={profile.display_name}
              onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="İsminiz nasıl görünsün?"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">
              {profile.display_name.length}/50
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Kısa Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Kendinizden biraz bahsedin..."
              maxLength={120}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {profile.bio.length}/120
            </p>
          </div>

          {/* Intent/Purpose Selector */}
          <div className="space-y-3">
            <Label>Ne arıyorsun?</Label>
            <ToggleGroup
              type="single"
              value={profile.purpose}
              onValueChange={(value) => {
                if (value) setProfile(prev => ({ ...prev, purpose: value as Purpose }));
              }}
              className="grid grid-cols-3 gap-2"
            >
              <ToggleGroupItem
                value="friendship"
                className="flex flex-col items-center gap-1 py-3 px-2 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Users className="w-5 h-5" />
                <span className="text-xs font-medium">Arkadaşlık</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dating"
                className="flex flex-col items-center gap-1 py-3 px-2 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Heart className="w-5 h-5" />
                <span className="text-xs font-medium">Flört</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="chat"
                className="flex flex-col items-center gap-1 py-3 px-2 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-medium">Sohbet</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Bu, diğerlerinin ne tür bir bağlantıya açık olduğunu anlamasına yardımcı olur
            </p>
          </div>

          {/* Hobbies Section */}
          <div className="space-y-3">
            <Label>Hobiler</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              İlgi alanlarını seç, ortak hobiler eşleşmelere yardımcı olur
            </p>
            <HobbySelector
              selectedHobbies={profile.hobbies}
              onHobbiesChange={(hobbies) => setProfile(prev => ({ ...prev, hobbies }))}
            />
          </div>

          {/* Visibility Toggle */}
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Kafelerde Görünür</p>
                  <p className="text-sm text-muted-foreground">Check-in yaptığında diğerleri seni görebilir</p>
                </div>
              </div>
              <Switch
                checked={profile.is_visible}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, is_visible: checked }))}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !profile.display_name.trim()}
            className="w-full h-12"
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
  );
}
