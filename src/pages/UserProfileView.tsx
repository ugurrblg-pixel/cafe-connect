import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ProfilePhotoCarousel } from '@/components/ProfilePhotoCarousel';
import { PurposeBadge } from '@/components/PurposeBadge';
import { HobbyDisplay } from '@/components/HobbyDisplay';
import { PremiumBadge } from '@/components/PremiumBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';
import { Purpose } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfileViews } from '@/hooks/useProfileViews';
import { useActiveCheckIn } from '@/hooks/useActiveCheckIn';
import { COFFEE_OPTIONS } from '@/components/profile/CoffeePreferenceSelector';
import { ENERGY_OPTIONS } from '@/components/profile/SocialEnergySelector';
import { Coffee, Zap } from 'lucide-react';

interface UserProfile {
  displayName: string;
  age: number | null;
  bio: string;
  photoUrl: string;
  photoUrls: string[];
  purpose: Purpose;
  hobbies: string[];
  isPremium: boolean;
  isVerified: boolean;
  coffeePreference: string | null;
  socialEnergy: string | null;
}

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { logProfileView } = useProfileViews();
  const { activeCheckIn } = useActiveCheckIn();
  

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      const [profileRes, subscriptionRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, age, bio, photo_url, photo_urls, purpose, hobbies, is_verified, coffee_preference, social_energy')
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
          isVerified: profileRes.data.is_verified || false,
          coffeePreference: profileRes.data.coffee_preference || null,
          socialEnergy: profileRes.data.social_energy || null,
        });
      }
      setProfileLoading(false);
    };

    fetchProfile();
    // Log profile view
    if (userId) {
      logProfileView(userId, activeCheckIn?.cafeId || null);
    }
  }, [userId]);

  if (profileLoading) {
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
            {profile.isVerified && <VerifiedBadge size="sm" showText />}
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

        {/* Coffee & Social Energy */}
        {(profile.coffeePreference || profile.socialEnergy) && (
          <section className="card-elevated p-4 mb-4">
            <h2 className="font-semibold text-foreground mb-3">Tercihler</h2>
            <div className="flex flex-wrap gap-3">
              {profile.coffeePreference && (() => {
                const coffee = COFFEE_OPTIONS.find(o => o.value === profile.coffeePreference);
                return coffee ? (
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2">
                    <span className="text-lg">{coffee.emoji}</span>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Coffee className="w-3 h-3" /> Kahve Tercihi</p>
                      <p className="text-sm font-medium text-foreground">{coffee.label}</p>
                    </div>
                  </div>
                ) : null;
              })()}
              {profile.socialEnergy && (() => {
                const energy = ENERGY_OPTIONS.find(o => o.value === profile.socialEnergy);
                return energy ? (
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2">
                    <span className="text-lg">{energy.emoji}</span>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Sosyal Enerji</p>
                      <p className="text-sm font-medium text-foreground">{energy.label}</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
