import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { UserCard } from '@/components/UserCard';
import { CheckInButton } from '@/components/CheckInButton';
import { ProfileBottomSheet } from '@/components/ProfileBottomSheet';
import { IntentFilterChips, FilterOption } from '@/components/IntentFilterChips';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useCafeUsers } from '@/hooks/useCafeUsers';
import { useCafes } from '@/hooks/useCafes';
import { useWaves } from '@/hooks/useWaves';
import { useMatches } from '@/hooks/useMatches';
import { MapPin, Star, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Purpose } from '@/types';

interface SelectedUser {
  id: string;
  userId?: string;
  name: string;
  photoUrl: string;
  bio: string;
  purpose: Purpose;
  allowDMs?: boolean;
  checkedInAt?: Date;
  cafeId?: string;
}

export default function CafeRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cafes, loading: cafesLoading } = useCafes();
  const { isCheckedIn, loading: checkInLoading, verifyingLocation, checkIn, checkOut } = useCheckIn(id || '');
  const { users: activeUsers, loading: usersLoading } = useCafeUsers(id || '');
  const { sendWave, hasWavedAt, hasReceivedWaveFrom } = useWaves();
  const { hasMatchWith, getMatchConversation, createConversationForMatch, matches } = useMatches();
  
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [intentFilter, setIntentFilter] = useState<FilterOption>('all');
  const [wavingAt, setWavingAt] = useState<string | null>(null);

  const cafe = cafes.find((c) => c.id === id);

  // Filter out current user and apply intent filter (must be before early returns)
  const otherUsers = activeUsers.filter((u) => u.userId !== user?.id);
  const filteredUsers = useMemo(() => {
    if (intentFilter === 'all') return otherUsers;
    return otherUsers.filter((u) => u.purpose === intentFilter);
  }, [otherUsers, intentFilter]);

  if (cafesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-56 w-full" />
        <div className="px-4 -mt-16 relative">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cafe not found</p>
      </div>
    );
  }

  const handleCheckIn = async () => {
    const success = await checkIn();
    if (success) {
      toast.success("You're now visible at " + cafe.name, {
        description: 'Your presence will expire in 60 minutes',
      });
    }
  };

  const handleCheckOut = async () => {
    const success = await checkOut();
    if (success) {
      toast.info("You've left " + cafe.name);
    }
  };

  const handleOpenChat = async (userId: string, userName: string) => {
    // Check if matched
    if (!hasMatchWith(userId)) {
      toast.info('Wave at each other first to unlock chat');
      return;
    }

    const conversationId = getMatchConversation(userId);
    if (conversationId) {
      navigate(`/chat/${conversationId}`);
    } else {
      // Find the match and create conversation
      const match = matches.find(m => 
        m.otherUser?.userId === userId
      );
      if (match) {
        const newConvoId = await createConversationForMatch(match.id);
        if (newConvoId) {
          navigate(`/chat/${newConvoId}`);
        }
      }
    }
  };

  const handleWave = async (userId: string, userName: string) => {
    if (!id) return;
    
    setWavingAt(userId);
    const result = await sendWave(userId, id);
    setWavingAt(null);
    
    if (result.success) {
      if (result.isMatch) {
        toast.success(`You and ${userName} waved at each other! 🎉`, {
          description: 'Chat is now unlocked',
        });
      } else if (hasReceivedWaveFrom(userId, id)) {
        // They already waved at us, so this should create a match
        toast.success(`You matched with ${userName}! 🎉`);
      } else {
        toast.success(`👋 You waved at ${userName}!`, {
          description: 'They\'ll be notified',
        });
      }
    }
  };

  const handleInteraction = (type: 'wave' | 'coffee' | 'eye', userId: string, userName: string) => {
    if (type === 'wave') {
      handleWave(userId, userName);
    } else {
      // Remove coffee and eye contact for now - focus on waves
      toast.info('Coming soon!');
    }
  };

  const handleUserTap = (activeUser: typeof activeUsers[0]) => {
    setSelectedUser({
      id: activeUser.id,
      userId: activeUser.userId,
      name: activeUser.displayName || activeUser.name,
      photoUrl: activeUser.photoUrl,
      bio: activeUser.bio,
      purpose: activeUser.purpose,
      allowDMs: activeUser.allowDMs,
      checkedInAt: activeUser.checkedInAt,
      cafeId: id,
    });
    setSheetOpen(true);
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-56">
        <img
          src={cafe.imageUrl}
          alt={cafe.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <Header title="" showBack transparent />
      </div>

      {/* Content */}
      <main className="px-4 -mt-16 relative pb-32">
        {/* Cafe Info Card */}
        <div className="card-elevated p-5 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">{cafe.name}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{cafe.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-full">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-semibold text-sm">{cafe.rating}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Users className="w-4 h-4" />
              <span>{activeUsers.length} people here</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{cafe.isOpen ? 'Open now' : 'Closed'}</span>
            </div>
          </div>
        </div>

        {/* Intent Filter Chips */}
        <IntentFilterChips
          selected={intentFilter}
          onChange={setIntentFilter}
          className="mb-4"
        />

        {/* Active Users */}
        <section>
          <h2 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
            People here now
            {intentFilter !== 'all' && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredUsers.length} of {otherUsers.length})
              </span>
            )}
          </h2>

          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((activeUser, index) => (
                <UserCard
                  key={activeUser.id}
                  user={{
                    id: activeUser.id,
                    name: activeUser.name,
                    displayName: activeUser.displayName,
                    age: activeUser.age || 0,
                    bio: activeUser.bio,
                    photoUrl: activeUser.photoUrl,
                    purpose: activeUser.purpose,
                    allowDMs: activeUser.allowDMs,
                    isOnline: true,
                    checkedInAt: activeUser.checkedInAt,
                    lastActiveAt: activeUser.lastActiveAt,
                  }}
                  onMessage={() => handleOpenChat(activeUser.userId, activeUser.displayName || activeUser.name)}
                  onInteraction={(type) => handleInteraction(type, activeUser.userId, activeUser.displayName || activeUser.name)}
                  waveState={
                    hasMatchWith(activeUser.userId) ? 'matched' :
                    hasWavedAt(activeUser.userId, id || '') ? 'waved' :
                    hasReceivedWaveFrom(activeUser.userId, id || '') ? 'received' :
                    'none'
                  }
                  isWaving={wavingAt === activeUser.userId}
                  onTap={() => handleUserTap(activeUser)}
                  style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                />
              ))}
            </div>
          ) : otherUsers.length > 0 ? (
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">No one matches this filter</p>
              <p className="text-sm text-muted-foreground">Try selecting "All" to see everyone</p>
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">No one else here yet</p>
              <p className="text-sm text-muted-foreground">Be the first to check in!</p>
            </div>
          )}
        </section>

        {/* Time limit notice */}
        {isCheckedIn && (
          <div className="mt-6 p-4 rounded-2xl bg-secondary flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Auto check-out</p>
              <p>You'll be automatically checked out after 60 minutes for your safety.</p>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Check-in Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-effect border-t border-border safe-bottom">
        <CheckInButton
          isCheckedIn={isCheckedIn}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          cafeName={cafe.name}
          verifyingLocation={verifyingLocation}
        />
      </div>

      {/* Profile Bottom Sheet */}
      <ProfileBottomSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cafeId={id}
      />
    </div>
  );
}
