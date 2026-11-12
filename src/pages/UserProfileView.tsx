import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ProfilePhotoCarousel } from '@/components/ProfilePhotoCarousel';
import { PurposeBadge } from '@/components/PurposeBadge';
import { HobbyDisplay } from '@/components/HobbyDisplay';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileViews } from '@/hooks/useProfileViews';
import { useActiveCheckIn } from '@/hooks/useActiveCheckIn';
import { useCafeUsers } from '@/hooks/useCafeUsers';

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { logProfileView } = useProfileViews();
  const { activeCheckIn, loading: checkInLoading } = useActiveCheckIn();
  const cafeId = activeCheckIn?.cafeId ?? '';
  const { users, loading, connectionStatus } = useCafeUsers(cafeId, {
    isCheckedIn: Boolean(cafeId),
  });
  const profile = users.find(member => member.userId === userId);
  const visibleUserId = profile?.userId;

  useEffect(() => {
    if (visibleUserId && visibleUserId !== user?.id) {
      void logProfileView(visibleUserId, cafeId);
    }
  }, [visibleUserId, user?.id, cafeId, logProfileView]);

  if (userId === user?.id) return <Navigate to="/profile" replace />;

  const pending = checkInLoading || Boolean(cafeId && loading);
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={profile?.displayName ?? 'Profil'} showBack />
      <main className="mx-auto max-w-[440px] px-4 pt-20">
        {pending ? (
          <div className="flex flex-col items-center gap-4 py-6" role="status" aria-label="Profil yükleniyor">
            <Skeleton className="aspect-square w-full max-w-[280px] rounded-2xl" />
            <Skeleton className="h-8 w-32" />
          </div>
        ) : profile ? (
          <>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ProfilePhotoCarousel
                photos={profile.photoUrls}
                avatarUrl={profile.photoUrl}
                name={profile.displayName}
                enableFullscreen={false}
              />
              <div className="flex max-w-full items-center gap-2">
                <h1 className="min-w-0 break-words text-2xl font-bold text-foreground">
                  {profile.displayName}{profile.age ? `, ${profile.age}` : ''}
                </h1>
                {profile.isVerified && <VerifiedBadge size="sm" showText />}
              </div>
              <PurposeBadge purpose={profile.purpose} />
            </div>
            {profile.bio && (
              <section className="card-elevated mb-4 p-4">
                <h2 className="mb-2 font-semibold text-foreground">Hakkında</h2>
                <p className="break-words text-muted-foreground">{profile.bio}</p>
              </section>
            )}
            {profile.hobbies.length > 0 && (
              <section className="card-elevated mb-4 p-4">
                <h2 className="mb-3 font-semibold text-foreground">Hobiler</h2>
                <HobbyDisplay hobbies={profile.hobbies} />
              </section>
            )}
          </>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground" role="status">
            {cafeId && connectionStatus === 'disconnected'
              ? 'Profil şu anda yüklenemiyor. Lütfen tekrar dene.'
              : 'Profil, aynı mekânda aktif check-in yaptığınızda ve paylaşım açıksa görünür.'}
          </p>
        )}
      </main>
    </div>
  );
}
