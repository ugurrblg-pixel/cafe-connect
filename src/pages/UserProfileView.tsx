import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ProfilePhotoCarousel } from '@/components/ProfilePhotoCarousel';
import { PurposeBadge } from '@/components/PurposeBadge';
import { HobbyDisplay } from '@/components/HobbyDisplay';
import { PremiumBadge } from '@/components/PremiumBadge';
import { supabase } from '@/integrations/supabase/client';
import { Purpose } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  displayName: string;
  age: number | null;
  bio: string;
  photoUrl: string;
  photoUrls: string[];
  purpose: Purpose;
  hobbies: string[];
  isPremium: boolean;
}

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      const [profileRes, subscriptionRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, age, bio, photo_url, photo_urls, purpose, hobbies')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status, expires_at')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        const sub = subscriptionRes.data;
        const isPremium = sub?.status === 'active' && 
          (!sub?.expires_at || new Date(sub.expires_at) > new Date());

        setProfile({
          displayName: profileRes.data.display_name || 'Anonim',
          age: profileRes.data.age,
          bio: profileRes.data.bio || '',
          photoUrl: profileRes.data.photo_url || '',
          photoUrls: (profileRes.data.photo_urls as string[]) || [],
          purpose: (profileRes.data.purpose as Purpose) || 'chat',
          hobbies: (profileRes.data.hobbies as string[]) || [],
          isPremium,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Profil" showBack />
        <main className="pt-20 px-4">
          <div className="flex flex-col items-center py-6">
            <Skeleton className="w-64 h-64 rounded-2xl mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Profil" showBack />
        <div className="flex items-center justify-center pt-32">
          <p className="text-muted-foreground">Profil bulunamadı</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={profile.displayName} showBack />

      <main className="pt-20 px-4">
        <div className="flex flex-col items-center py-6">
          <ProfilePhotoCarousel
            photos={profile.photoUrls}
            avatarUrl={profile.photoUrl}
            name={profile.displayName}
            size="lg"
            className="mb-4"
          />

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              {profile.displayName}{profile.age ? `, ${profile.age}` : ''}
            </h1>
            {profile.isPremium && <PremiumBadge size="sm" />}
          </div>

          <PurposeBadge purpose={profile.purpose} />
        </div>

        {/* Bio */}
        {profile.bio && (
          <section className="card-elevated p-4 mb-4">
            <h2 className="font-semibold text-foreground mb-2">Hakkında</h2>
            <p className="text-muted-foreground">{profile.bio}</p>
          </section>
        )}

        {/* Hobbies */}
        {profile.hobbies.length > 0 && (
          <section className="card-elevated p-4 mb-4">
            <h2 className="font-semibold text-foreground mb-3">Hobiler</h2>
            <HobbyDisplay hobbies={profile.hobbies} />
          </section>
        )}
      </main>
    </div>
  );
}
