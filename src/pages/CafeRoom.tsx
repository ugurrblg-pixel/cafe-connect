import { VenueSources } from '@/components/VenueSources';
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { UserCard } from '@/components/UserCard';
import { SparkButton } from '@/components/SparkButton';
import { CheckInButton } from '@/components/CheckInButton';
import { ProfileBottomSheet } from '@/components/ProfileBottomSheet';
import { IntentFilterChips, FilterOption } from '@/components/IntentFilterChips';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { CafeImage } from '@/components/CafeImage';
import { ChatLimitIndicator } from '@/components/ChatLimitIndicator';
import { PaywallModal } from '@/components/PaywallModal';
import { SparkPaywallModal } from '@/components/SparkPaywallModal';
import { ProfileGateModal, GatedAction } from '@/components/ProfileGateModal';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useCafeUsers } from '@/hooks/useCafeUsers';
import { useCafes } from '@/hooks/useCafes';
import { useWaves } from '@/hooks/useWaves';
import { useSparks } from '@/hooks/useSparks';
import { useMatches } from '@/hooks/useMatches';
import { usePremium } from '@/hooks/usePremium';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useI18n } from '@/contexts/I18nContext';
import { MapPin, Users, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Purpose } from '@/types';
import { getCafeStatus, getStatusColors } from '@/lib/openingHours';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  
  // Load only server-authorized records without public profile broadcasts.
  const { users: activeUsers, loading: usersLoading, connectionStatus, refetch: refetchUsers } = useCafeUsers(id || '', {
    isCheckedIn,
  });
  
  const { sendWave, hasWavedAt, hasReceivedWaveFrom, sentWaves } = useWaves();
  const { sendSpark, hasSentSparkTo, canSendSpark, dailySparkCount, sparkLimit } = useSparks();
  const { hasMatchWith, getMatchConversation, createConversationForMatch, matches, refetch: refetchMatches } = useMatches();
  const { canStartChat, incrementChatCount, isPremium } = usePremium();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = activeUsers.find(member => member.userId === selectedUserId) || null;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [intentFilter, setIntentFilter] = useState<FilterOption>('all');
  const [wavingAt, setWavingAt] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSparkPaywall, setShowSparkPaywall] = useState(false);
  const [sparkPaywallTrigger, setSparkPaywallTrigger] = useState<'send_limit' | 'reveal_sender' | 'accept_spark'>('send_limit');
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [gatedAction, setGatedAction] = useState<GatedAction>('check-in');
  const [sparkingAt, setSparkingAt] = useState<string | null>(null);

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
        <div className="max-w-sm px-6 text-center"><MapPin className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" /><h1 className="text-xl font-bold">Mekan yüklenemedi</h1><p className="mt-2 text-sm text-muted-foreground">Bağlantı kesilmiş veya mekan artık listede olmayabilir.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="outline" className="rounded-full" onClick={()=>window.location.reload()}>Tekrar dene</Button><Button className="rounded-full" onClick={()=>navigate('/')}>Mekanlara dön</Button></div></div>
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

    // Require at least one profile photo
    if (!profile?.photo_url) {
      toast.error('Check-in için profil fotoğrafı gerekli', {
        description: 'Profil sayfasından fotoğraf ekleyebilirsin.',
      });
      return;
    }

    const success = await checkIn();
    if (success) {
      toast.success(cafe.name + ' mekânına katıldın', {
        description: 'Onaylı fotoğrafların ve sınırlı profilin aynı mekândaki katılımcılara görünür. Girişin 60 dakika geçerli.',
      });
    }
  };

  const handleCheckOut = async () => {
    const success = await checkOut();
    if (success) {
      setSelectedUserId(null); setSheetOpen(false);
      toast.info(cafe.name + ' mekânından ayrıldın');
    }
  };

  const handleOpenChat = async (userId: string, _userName: string) => {
    if (import.meta.env.VITE_SAFE_CHAT_ENABLED !== 'true') {
      toast.info('Güvenli mesajlaşma hazırlanıyor.'); return;
    }
    const match = matches.find(row => row.otherUser.userId === userId && row.cafeId === id);
    if (!match) { toast.info('Önce karşılıklı selamlaşın.'); return; }
    const chatId = await createConversationForMatch(match.id);
    if (chatId) navigate(`/chat/${chatId}`);
  };

  const handleWave = async (userId: string, userName: string) => {
    if (!id) return;

    // Require check-in to wave
    if (!isCheckedIn) {
      toast.info('El sallamak için önce check-in yap ☕');
      return;
    }

    // Gate wave behind profile completion
    if (!isProfileComplete) {
      setGatedAction('wave' as GatedAction);
      setShowProfileGate(true);
      return;
    }

    setWavingAt(userId);
    const result = await sendWave(userId, id);
    setWavingAt(null);
    
    if (result.success) {
      if (result.isMatch) {
        await refetchMatches();
        toast.success(`${userName} ile karşılıklı selamlaştınız!`, {
          description: import.meta.env.VITE_SAFE_CHAT_ENABLED === 'true' ? 'Sohbet düğmesiyle konuşmaya başlayabilirsiniz.' : 'Mesajlaşma henüz hazırlanıyor.',
        });
      } else {
        toast.success(`👋 ${userName} kişisine el salladın!`, {
          description: 'Selamın kaydedildi',
        });
      }
    }
  };

  const handleInteraction = (type: 'wave' | 'coffee' | 'eye', userId: string, userName: string) => {
    if (type === 'wave') {
      handleWave(userId, userName);
    } else {
      toast.info('Coming soon!');
    }
  };

  const handleSendSpark = async (userId: string, userName: string) => {
    if (!isProfileComplete) {
      setGatedAction('wave' as GatedAction);
      setShowProfileGate(true);
      return;
    }

    if (!canSendSpark) {
      setSparkPaywallTrigger('send_limit');
      setShowSparkPaywall(true);
      return;
    }

    if (!id) return;
    setSparkingAt(userId);
    const result = await sendSpark(userId, id);
    setSparkingAt(null);

    if (result.success) {
      toast.success(`☕ ${userName} kişisine ilgi gönderildi!`, {
        description: '30 dakika içinde geçerli',
      });
    }
  };

  const handleUserTap = (activeUser: typeof activeUsers[0]) => {
    setSelectedUserId(activeUser.userId);
    setSheetOpen(true);
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-56">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          category={cafe.category}
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
            <VenueSources venues={[cafe]} />
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
              <span>{cafeStatus ? ({open:'Açık','closing-soon':'Yakında kapanıyor',closed:'Kapalı',unknown:'Açılış bilgisi doğrulanmadı'}[cafeStatus.status]) : 'Açılış bilgisi doğrulanmadı'}</span>
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
          {import.meta.env.VITE_PAYMENTS_ENABLED === 'true' && !isPremium && isCheckedIn && (
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
                ({otherUsers.length} kişiden {filteredUsers.length})
              </span>
            )}
            {/* Connection status indicator */}
            <ConnectionIndicator status={connectionStatus} className="ml-auto" />
          </h2>

          {!isCheckedIn ? (
            <div className="card-elevated p-6 text-center">
              <ShieldCheck className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden="true" />
              <p className="font-medium">Katılımcıları görmek için Buradayım de</p>
              <p className="mt-2 text-sm text-muted-foreground">Katılınca aynı mekândaki kişilerle sınırlı profilini paylaşırsın. İletişim bilgilerin gizli kalır.</p>
            </div>
          ) : usersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : connectionStatus === 'disconnected' ? (
            <div role="alert" className="card-elevated p-6 text-center">
              <p>Katılımcılar yüklenemedi. Bağlantını kontrol edip tekrar dene.</p>
              <Button className="mt-3" variant="outline" onClick={() => void refetchUsers()}>Tekrar dene</Button>
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
                    isVerified: activeUser.isVerified,
                    checkedInAt: activeUser.checkedInAt,
                    lastActiveAt: activeUser.lastActiveAt,
                  }}
                  onMessage={() => handleOpenChat(activeUser.userId, activeUser.displayName || activeUser.name)}
                  onInteraction={(type) => handleInteraction(type, activeUser.userId, activeUser.displayName || activeUser.name)}
                  waveState={
                    hasMatchWith(activeUser.userId, id) ? 'matched' :
                    hasWavedAt(activeUser.userId, id || '') ? 'waved' :
                    hasReceivedWaveFrom(activeUser.userId, id || '') ? 'received' :
                    'none'
                  }
                  isWaving={wavingAt === activeUser.userId}
                  onTap={() => handleUserTap(activeUser)}
                  style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                  sparkButton={
                    import.meta.env.VITE_PAYMENTS_ENABLED === 'true' ?
                    <SparkButton
                      onSend={() => handleSendSpark(activeUser.userId, activeUser.displayName || activeUser.name)}
                      hasSent={hasSentSparkTo(activeUser.userId, id || '')}
                      isSending={sparkingAt === activeUser.userId}
                      disabled={!isCheckedIn}
                    />
                    : undefined
                  }
                />
              ))}
            </div>
          ) : otherUsers.length > 0 ? (
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">Bu seçime uygun kimse yok</p>
              <p className="text-sm text-muted-foreground">Herkesi görmek için Tümü seçeneğine dokun</p>
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">Henüz başka kimse burada değil</p>
              <p className="text-sm text-muted-foreground">Buradayım diyerek ilk sen katıl!</p>
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
        open={sheetOpen && !!selectedUser && isCheckedIn}
        onOpenChange={setSheetOpen}
        cafeId={id}
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="chat_limit"
      />

      {/* Spark Paywall Modal */}
      <SparkPaywallModal
        isOpen={showSparkPaywall}
        onClose={() => setShowSparkPaywall(false)}
        trigger={sparkPaywallTrigger}
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
