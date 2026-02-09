import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { UserCard } from '@/components/UserCard';
import { CheckInButton } from '@/components/CheckInButton';
import { ProfileBottomSheet } from '@/components/ProfileBottomSheet';
import { IntentFilterChips, FilterOption } from '@/components/IntentFilterChips';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { CafeImage } from '@/components/CafeImage';
import { ChatLimitIndicator } from '@/components/ChatLimitIndicator';
import { PaywallModal } from '@/components/PaywallModal';
import { ProfileGateModal, GatedAction } from '@/components/ProfileGateModal';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useCafeUsers } from '@/hooks/useCafeUsers';
import { useCafes } from '@/hooks/useCafes';
import { useWaves } from '@/hooks/useWaves';
import { useMatches } from '@/hooks/useMatches';
import { usePremium } from '@/hooks/usePremium';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useI18n } from '@/contexts/I18nContext';
import { MapPin, Users, Clock, AlertCircle, UserPlus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Purpose } from '@/types';
import { getCafeStatus, getStatusColors } from '@/lib/openingHours';
import { cn } from '@/lib/utils';

interface SelectedUser {
  id: string;
  userId?: string;
  name: string;
  photoUrl: string;
  photoUrls?: string[];
  bio: string;
  purpose: Purpose;
  allowDMs?: boolean;
  checkedInAt?: Date;
  cafeId?: string;
  hobbies?: string[];
}

export default function CafeRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { cafes, loading: cafesLoading } = useCafes();
  const { isCheckedIn, loading: checkInLoading, verifyingLocation, checkIn, checkOut } = useCheckIn(id || '');
  
  // Throttled join notification callback
  const handleUserJoined = useCallback(() => {
    toast(t.cafeRoom.someoneJoined, {
      icon: <UserPlus className="w-4 h-4 text-primary" />,
      duration: 3000,
    });
  }, [t]);
  
  // Pass presence options to useCafeUsers - user joins presence when checked in
  const { users: activeUsers, loading: usersLoading, connectionStatus } = useCafeUsers(id || '', {
    joinPresence: true,
    isCheckedIn,
    displayName: profile?.display_name || '',
    photoUrl: profile?.photo_url || '',
    purpose: profile?.purpose || 'chat',
    onUserJoined: handleUserJoined,
  });
  
  const { sendWave, hasWavedAt, hasReceivedWaveFrom } = useWaves();
  const { hasMatchWith, getMatchConversation, createConversationForMatch, matches } = useMatches();
  const { canStartChat, incrementChatCount, isPremium } = usePremium();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [intentFilter, setIntentFilter] = useState<FilterOption>('all');
  const [wavingAt, setWavingAt] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [gatedAction, setGatedAction] = useState<GatedAction>('check-in');

  const cafe = cafes.find((c) => c.id === id);
  
  // Get live cafe status from opening hours
  const cafeStatus = cafe ? getCafeStatus(cafe.openingHours) : null;
  const statusColors = cafeStatus ? getStatusColors(cafeStatus.status) : null;

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
    // Gate check-in behind profile completion
    if (!isProfileComplete) {
      setGatedAction('check-in');
      setShowProfileGate(true);
      return;
    }

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
    // Gate messaging behind profile completion
    if (!isProfileComplete) {
      setGatedAction('message');
      setShowProfileGate(true);
      return;
    }

    // Check if matched
    if (!hasMatchWith(userId)) {
      toast.info('Wave at each other first to unlock chat');
      return;
    }

    // Check existing conversation first - this doesn't count as new chat
    const existingConversationId = getMatchConversation(userId);
    if (existingConversationId) {
      navigate(`/chat/${existingConversationId}`);
      return;
    }

    // Check chat limit for new conversation
    if (!canStartChat) {
      setShowPaywall(true);
      return;
    }

    // Find the match and create conversation
    const match = matches.find(m => m.otherUser?.userId === userId);
    if (match) {
      // Increment chat count before creating conversation
      const allowed = await incrementChatCount();
      if (!allowed) {
        setShowPaywall(true);
        return;
      }

      const newConvoId = await createConversationForMatch(match.id);
      if (newConvoId) {
        navigate(`/chat/${newConvoId}`);
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
      photoUrls: activeUser.photoUrls,
      bio: activeUser.bio,
      purpose: activeUser.purpose,
      allowDMs: activeUser.allowDMs,
      checkedInAt: activeUser.checkedInAt,
      cafeId: id,
      hobbies: activeUser.hobbies,
    });
    setSheetOpen(true);
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-56">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          className="h-56"
          aspectRatio="hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <Header title="" showBack transparent />
      </div>

      {/* Content */}
      <main className="px-4 -mt-16 relative pb-32">
        {/* Cafe Info Card */}
        <div className="card-elevated p-5 mb-6">
          <div className="mb-3">
            <h1 className="text-xl font-bold text-foreground mb-1">{cafe.name}</h1>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{cafe.address}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Users className="w-4 h-4" />
              <span>{activeUsers.length} kişi burada</span>
            </div>
            <div className={cn(
              'flex items-center gap-1.5',
              statusColors?.text || 'text-muted-foreground',
              cafeStatus?.status === 'closing-soon' && 'font-medium'
            )}>
              <Clock className={cn(
                'w-4 h-4',
                cafeStatus?.status === 'closing-soon' && 'animate-pulse'
              )} />
              <span>{cafeStatus?.label || (cafe.isOpen ? 'Open now' : 'Closed')}</span>
            </div>
          </div>
        </div>

        {/* Intent Filter & Chat Limit */}
        <div className="flex items-center gap-3 mb-4">
          <IntentFilterChips
            selected={intentFilter}
            onChange={setIntentFilter}
            className="flex-1"
          />
          {!isPremium && isCheckedIn && (
            <ChatLimitIndicator onUpgradeClick={() => setShowPaywall(true)} />
          )}
        </div>

        {/* Active Users */}
        <section>
          <h2 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
            Şu an burada
            {intentFilter !== 'all' && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredUsers.length} of {otherUsers.length})
              </span>
            )}
            {/* Connection status indicator */}
            <ConnectionIndicator status={connectionStatus} className="ml-auto" />
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
            <ShieldCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Güvenlik & Gizlilik</p>
              <p>60 dakika sonra otomatik check-out yapılır. Tam konumun asla paylaşılmaz — sadece bu kafede olduğun görünür.</p>
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

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="chat_limit"
      />

      {/* Profile Gate Modal */}
      <ProfileGateModal
        open={showProfileGate}
        onOpenChange={setShowProfileGate}
        action={gatedAction}
      />
    </div>
  );
}
