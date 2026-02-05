import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Camera, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileData {
  id: string;
  display_name: string;
  bio: string;
  photo_url: string;
  is_visible: boolean;
}

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    display_name: '',
    bio: '',
    photo_url: '',
    is_visible: true,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, photo_url, is_visible')
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
          is_visible: data.is_visible ?? true,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, photo_url: publicUrl }));
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
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

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: trimmedName,
        bio: trimmedBio,
        photo_url: profile.photo_url,
        is_visible: profile.is_visible,
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
      <Header title="Edit Profile" showBack />

      <main className="pt-20 px-4">
        {/* Profile Photo */}
        <div className="flex flex-col items-center py-6">
          <div className="relative mb-6">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover border-4 border-card shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center border-4 border-card shadow-lg">
                <span className="text-3xl font-bold text-primary-foreground">
                  {getInitials(profile.display_name)}
                </span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground">Tap to change photo</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={profile.display_name}
              onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="How should others see you?"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">
              {profile.display_name.length}/50
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Short Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell others a bit about yourself..."
              maxLength={120}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {profile.bio.length}/120
            </p>
          </div>

          {/* Visibility Toggle */}
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Visible in Cafes</p>
                  <p className="text-sm text-muted-foreground">Others can see you when checked in</p>
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
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
