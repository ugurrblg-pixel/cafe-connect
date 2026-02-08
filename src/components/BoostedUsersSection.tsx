import { Star, Zap, Lock } from 'lucide-react';
import { BoostedUserCard } from './BoostedUserCard';
import { LockedBoostPreview } from './LockedBoostPreview';
import { User, Purpose } from '@/types';

interface BoostedUser {
  id: string;
  userId: string;
  name: string;
  displayName?: string;
  age?: number;
  bio: string;
  photoUrl: string;
  purpose: Purpose;
  allowDMs?: boolean;
  checkedInAt?: Date;
  lastActiveAt?: Date;
  isBoosted?: boolean;
  isPremium?: boolean;
}

interface BoostedUsersSectionProps {
  boostedUsers: BoostedUser[];
  regularUsers: BoostedUser[];
  currentUserIsPremium?: boolean;
  onUserTap: (user: BoostedUser) => void;
  onMessage: (userId: string, userName: string) => void;
  onInteraction: (type: 'wave' | 'coffee' | 'eye', userId: string, userName: string) => void;
  getWaveState: (userId: string) => 'none' | 'waved' | 'received' | 'matched';
  wavingAt: string | null;
  cafeId?: string;
}

export function BoostedUsersSection({
  boostedUsers,
  regularUsers,
  currentUserIsPremium = false,
  onUserTap,
  onMessage,
  onInteraction,
  getWaveState,
  wavingAt,
}: BoostedUsersSectionProps) {
  const hasBoostedUsers = boostedUsers.length > 0;

  return (
    <div className="space-y-6">
      {/* Boosted Users Section */}
      <section>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          Öne Çıkanlar
          {hasBoostedUsers && (
            <span className="text-xs text-muted-foreground font-normal">
              ({boostedUsers.length})
            </span>
          )}
        </h3>

        {hasBoostedUsers ? (
          <div className="space-y-3">
            {boostedUsers.map((user, index) => (
              <BoostedUserCard
                key={user.id}
                user={{
                  id: user.id,
                  name: user.name,
                  displayName: user.displayName,
                  age: user.age || 0,
                  bio: user.bio,
                  photoUrl: user.photoUrl,
                  purpose: user.purpose,
                  allowDMs: user.allowDMs || true,
                  isOnline: true,
                  checkedInAt: user.checkedInAt,
                  lastActiveAt: user.lastActiveAt,
                }}
                isBoosted={user.isBoosted}
                isPremium={user.isPremium}
                badgeType={user.isBoosted ? 'boost' : 'premium'}
                onMessage={() => onMessage(user.userId, user.displayName || user.name)}
                onInteraction={(type) => onInteraction(type, user.userId, user.displayName || user.name)}
                waveState={getWaveState(user.userId)}
                isWaving={wavingAt === user.userId}
                onTap={() => onUserTap(user)}
                style={{ animationDelay: `${index * 100}ms` }}
                className="animate-fade-in"
              />
            ))}
          </div>
        ) : currentUserIsPremium ? (
          <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-center">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Henüz boost aktifleştiren yok
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Boost ile bu bölümde görün!
            </p>
          </div>
        ) : (
          <LockedBoostPreview count={2} />
        )}
      </section>

      {/* Regular Users Section */}
      {regularUsers.length > 0 && (
        <section>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            Diğer Katılımcılar
            <span className="text-xs text-muted-foreground font-normal">
              ({regularUsers.length})
            </span>
          </h3>

          <div className="space-y-3">
            {regularUsers.map((user, index) => (
              <BoostedUserCard
                key={user.id}
                user={{
                  id: user.id,
                  name: user.name,
                  displayName: user.displayName,
                  age: user.age || 0,
                  bio: user.bio,
                  photoUrl: user.photoUrl,
                  purpose: user.purpose,
                  allowDMs: user.allowDMs || true,
                  isOnline: true,
                  checkedInAt: user.checkedInAt,
                  lastActiveAt: user.lastActiveAt,
                }}
                onMessage={() => onMessage(user.userId, user.displayName || user.name)}
                onInteraction={(type) => onInteraction(type, user.userId, user.displayName || user.name)}
                waveState={getWaveState(user.userId)}
                isWaving={wavingAt === user.userId}
                onTap={() => onUserTap(user)}
                style={{ animationDelay: `${index * 100}ms` }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
