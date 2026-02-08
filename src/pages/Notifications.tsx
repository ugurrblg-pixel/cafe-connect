import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { PageLayout } from '@/components/PageLayout';
import { MatchActionSheet } from '@/components/MatchActionSheet';
import { useWaves } from '@/hooks/useWaves';
import { useMatches } from '@/hooks/useMatches';
import { useCafes } from '@/hooks/useCafes';
import { useLongPress } from '@/hooks/useLongPress';
import { Hand, Heart, Loader2, MessageSquare, Coffee, Sparkles, Crown, Lightbulb, UserMinus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Match type for state
interface MatchData {
  id: string;
  user1Id: string;
  user2Id: string;
  cafeId: string;
  conversationId: string | null;
  createdAt: Date;
  otherUser?: {
    userId: string;
    displayName: string;
    photoUrl: string;
  };
  cafe?: {
    name: string;
  };
}

export default function Notifications() {
  const navigate = useNavigate();
  const { incomingWaves, sendWave, hasWavedAt, loading: wavesLoading } = useWaves();
  const { matches, createConversationForMatch, loading: matchesLoading } = useMatches();
  const { cafes } = useCafes();
  const [processingWave, setProcessingWave] = useState<string | null>(null);
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);
  
  // Match deletion state
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [showMatchActionSheet, setShowMatchActionSheet] = useState(false);
  // Track deleted matches locally (UI only)
  const [deletedMatches, setDeletedMatches] = useState<Set<string>>(new Set());

  const loading = wavesLoading || matchesLoading;

  const getCafeName = (cafeId: string) => {
    return cafes.find(c => c.id === cafeId)?.name || 'bir kafe';
  };

  const handleWaveBack = async (wave: typeof incomingWaves[0]) => {
    setProcessingWave(wave.id);
    
    const result = await sendWave(wave.fromUserId, wave.cafeId);
    
    if (result.success && result.isMatch) {
      toast.success("Eşleştiniz! 🎉", {
        description: "Artık sohbet edebilirsiniz",
      });
      setTimeout(() => navigate('/messages'), 1500);
    } else if (result.success) {
      toast.success('El salladın! 👋');
    }
    
    setProcessingWave(null);
  };

  const handleOpenChat = async (match: typeof matches[0]) => {
    setProcessingMatch(match.id);
    
    let conversationId = match.conversationId;
    
    if (!conversationId) {
      conversationId = await createConversationForMatch(match.id);
    }
    
    setProcessingMatch(null);
    
    if (conversationId) {
      navigate(`/chat/${conversationId}`);
    } else {
      toast.error('Sohbet açılamadı');
    }
  };

  const handleLongPressMatch = (match: MatchData) => {
    setSelectedMatch(match);
    setShowMatchActionSheet(true);
  };

  const handleUnmatch = () => {
    if (!selectedMatch) return;
    
    // Add to deleted set (UI only)
    setDeletedMatches(prev => new Set(prev).add(selectedMatch.id));
    
    toast.success('Eşleşme kaldırıldı', {
      description: `${selectedMatch.otherUser?.displayName || 'Kullanıcı'} ile eşleşme silindi`,
    });
    
    setSelectedMatch(null);
  };

  // Filter out waves from users we've already waved back at (they become matches)
  const pendingWaves = incomingWaves.filter(wave => !hasWavedAt(wave.fromUserId, wave.cafeId));
  
  // Filter out deleted matches
  const visibleMatches = matches.filter(m => !deletedMatches.has(m.id));

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Bildirimler" />

        <main className="pt-16">
          <Tabs defaultValue="waves" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="waves" className="flex items-center gap-2">
                <Hand className="w-4 h-4" />
                El Sallamalar
                {pendingWaves.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    {pendingWaves.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="matches" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Eşleşmeler
                {visibleMatches.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                    {visibleMatches.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="waves" className="mt-2 px-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : pendingWaves.length > 0 ? (
                <div className="space-y-3">
                  {pendingWaves.map((wave, index) => (
                    <div
                      key={wave.id}
                      className="card-elevated p-4 animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {wave.fromUser?.photoUrl ? (
                            <img
                              src={wave.fromUser.photoUrl}
                              alt={wave.fromUser.displayName}
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <InitialsAvatar
                              name={wave.fromUser?.displayName || 'Biri'}
                              size="md"
                              className="rounded-full w-14 h-14"
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">
                            {wave.fromUser?.displayName || 'Biri'} sana el salladı 👋
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getCafeName(wave.cafeId)} • {formatDistanceToNow(wave.createdAt, { addSuffix: true, locale: tr })}
                          </p>
                        </div>

                        {/* Wave back button */}
                        <Button
                          size="sm"
                          onClick={() => handleWaveBack(wave)}
                          disabled={processingWave === wave.id}
                          className="flex-shrink-0"
                        >
                          {processingWave === wave.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Hand className="w-4 h-4 mr-1" />
                              Selam ver
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <WavesEmptyState onDiscoverClick={() => navigate('/')} />
              )}
            </TabsContent>

            <TabsContent value="matches" className="mt-2 px-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : visibleMatches.length > 0 ? (
                <div className="space-y-3">
                  {visibleMatches.map((match, index) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      index={index}
                      isProcessing={processingMatch === match.id}
                      onOpenChat={() => handleOpenChat(match)}
                      onLongPress={() => handleLongPressMatch(match)}
                    />
                  ))}
                </div>
              ) : (
                <MatchesEmptyState onDiscoverClick={() => navigate('/')} />
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Match Action Sheet */}
        <MatchActionSheet
          open={showMatchActionSheet}
          onOpenChange={setShowMatchActionSheet}
          userName={selectedMatch?.otherUser?.displayName || ''}
          onUnmatch={handleUnmatch}
        />
      </div>
    </PageLayout>
  );
}

// Match Card component with long press support
function MatchCard({
  match,
  index,
  isProcessing,
  onOpenChat,
  onLongPress,
}: {
  match: MatchData;
  index: number;
  isProcessing: boolean;
  onOpenChat: () => void;
  onLongPress: () => void;
}) {
  const longPressHandlers = useLongPress({
    onLongPress,
    delay: 500,
  });

  return (
    <div
      {...longPressHandlers}
      className={cn(
        "card-elevated p-4 animate-slide-up select-none cursor-pointer",
        "active:scale-[0.98] transition-transform"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {match.otherUser?.photoUrl ? (
            <img
              src={match.otherUser.photoUrl}
              alt={match.otherUser.displayName}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar
              name={match.otherUser?.displayName || 'Biri'}
              size="md"
              className="rounded-full w-14 h-14"
            />
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center border-2 border-card">
            <Heart className="w-3 h-3 text-accent-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">
            {match.otherUser?.displayName || 'Biri'} ile eşleştin!
          </p>
          <p className="text-sm text-muted-foreground">
            {match.cafe?.name || 'bir kafede'} • {formatDistanceToNow(match.createdAt, { addSuffix: true, locale: tr })}
          </p>
        </div>

        {/* Chat button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat();
          }}
          disabled={isProcessing}
          className="flex-shrink-0"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-1" />
              Sohbet
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Empty state for Waves tab
function WavesEmptyState({ onDiscoverClick }: { onDiscoverClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
          <Hand className="w-12 h-12 text-primary/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
          <Coffee className="w-5 h-5 text-amber-600" />
        </div>
      </div>

      {/* Text */}
      <h3 className="font-semibold text-lg text-foreground mb-2 text-center">
        Henüz el sallama yok
      </h3>
      <p className="text-muted-foreground text-center text-sm max-w-[260px] mb-6 leading-relaxed">
        Bir kafeye git ve oradaki kişilere el salla. Onlar da sana el sallarsa eşleşirsiniz!
      </p>

      {/* CTA Button */}
      <Button onClick={onDiscoverClick} className="gap-2 mb-6">
        <Coffee className="w-4 h-4" />
        Kafeleri Keşfet
      </Button>

      {/* Tip Card */}
      <div className="w-full max-w-sm p-4 rounded-2xl bg-secondary/50 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">İpucu</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kafede check-in yaptığında oradaki herkes seni görebilir. İlgini çeken birine el salla!
            </p>
          </div>
        </div>
      </div>

      {/* Premium Tease */}
      <PremiumTease />
    </div>
  );
}

// Empty state for Matches tab
function MatchesEmptyState({ onDiscoverClick }: { onDiscoverClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center">
          <Heart className="w-12 h-12 text-accent/60" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Text */}
      <h3 className="font-semibold text-lg text-foreground mb-2 text-center">
        Henüz eşleşme yok
      </h3>
      <p className="text-muted-foreground text-center text-sm max-w-[260px] mb-6 leading-relaxed">
        Birisi sana el salladığında ve sen de karşılık verdiğinde eşleşirsiniz. Sonra sohbet başlayabilir!
      </p>

      {/* CTA Button */}
      <Button onClick={onDiscoverClick} className="gap-2 mb-6">
        <Coffee className="w-4 h-4" />
        Kafeleri Keşfet
      </Button>

      {/* Tip Card */}
      <div className="w-full max-w-sm p-4 rounded-2xl bg-secondary/50 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Hand className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Nasıl çalışır?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Karşılıklı el sallama = eşleşme. Eşleşince mesajlaşmaya başlayabilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* Premium Tease */}
      <PremiumTease />
    </div>
  );
}

// Subtle Premium tease component
function PremiumTease() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/subscription')}
      className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors group"
    >
      <Crown className="w-4 h-4 text-amber-500" />
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        Premium ile daha görünür ol
      </span>
      <Sparkles className="w-3 h-3 text-amber-500/60" />
    </button>
  );
}
