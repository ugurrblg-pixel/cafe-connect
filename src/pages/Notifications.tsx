import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { PageLayout } from '@/components/PageLayout';
import { useWaves } from '@/hooks/useWaves';
import { useMatches } from '@/hooks/useMatches';
import { useCafes } from '@/hooks/useCafes';
import { Hand, Heart, Loader2, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function Notifications() {
  const navigate = useNavigate();
  const { incomingWaves, sendWave, hasWavedAt, loading: wavesLoading } = useWaves();
  const { matches, createConversationForMatch, loading: matchesLoading } = useMatches();
  const { cafes } = useCafes();
  const [processingWave, setProcessingWave] = useState<string | null>(null);
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);

  const loading = wavesLoading || matchesLoading;

  const getCafeName = (cafeId: string) => {
    return cafes.find(c => c.id === cafeId)?.name || 'a cafe';
  };

  const handleWaveBack = async (wave: typeof incomingWaves[0]) => {
    setProcessingWave(wave.id);
    
    const result = await sendWave(wave.fromUserId, wave.cafeId);
    
    if (result.success && result.isMatch) {
      toast.success("It's a match! 🎉", {
        description: "You can now chat with each other",
      });
      // Navigate to messages after a brief delay
      setTimeout(() => navigate('/messages'), 1500);
    } else if (result.success) {
      toast.success('Wave sent back! 👋');
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
      toast.error('Could not open chat');
    }
  };

  // Filter out waves from users we've already waved back at (they become matches)
  const pendingWaves = incomingWaves.filter(wave => !hasWavedAt(wave.fromUserId, wave.cafeId));

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Notifications" />

      <main className="pt-16">
        <Tabs defaultValue="waves" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="waves" className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              Waves
              {pendingWaves.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  {pendingWaves.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Matches
              {matches.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                  {matches.length}
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
                            name={wave.fromUser?.displayName || 'Someone'}
                            size="md"
                            className="rounded-full w-14 h-14"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          {wave.fromUser?.displayName || 'Someone'} waved at you 👋
                        </p>
                        <p className="text-sm text-muted-foreground">
                          at {getCafeName(wave.cafeId)} • {formatDistanceToNow(wave.createdAt, { addSuffix: true })}
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
                            Wave back
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Hand className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No waves yet</h3>
                <p className="text-muted-foreground text-center">
                  When someone waves at you, it will appear here
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="matches" className="mt-2 px-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((match, index) => (
                  <div
                    key={match.id}
                    className="card-elevated p-4 animate-slide-up"
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
                            name={match.otherUser?.displayName || 'Someone'}
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
                          You matched with {match.otherUser?.displayName || 'Someone'}!
                        </p>
                        <p className="text-sm text-muted-foreground">
                          at {match.cafe?.name || 'a cafe'} • {formatDistanceToNow(match.createdAt, { addSuffix: true })}
                        </p>
                      </div>

                      {/* Chat button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenChat(match)}
                        disabled={processingMatch === match.id}
                        className="flex-shrink-0"
                      >
                        {processingMatch === match.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Heart className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No matches yet</h3>
                <p className="text-muted-foreground text-center">
                  When you and someone wave at each other, you'll match and can start chatting!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </PageLayout>
  );
}
