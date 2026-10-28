import { PrivateProfileImage } from "@/components/PrivateProfileImage";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { PageLayout } from "@/components/PageLayout";
import { MatchActionSheet } from "@/components/MatchActionSheet";
import { SparkReceivedList } from "@/components/SparkReceivedList";
import { SparkPaywallModal } from "@/components/SparkPaywallModal";
import { useWaves } from "@/hooks/useWaves";
import { useMatches } from "@/hooks/useMatches";
import { useSparks } from "@/hooks/useSparks";
import { useCafes } from "@/hooks/useCafes";
import { useActiveCheckIn } from "@/hooks/useActiveCheckIn";
import { useLongPress } from "@/hooks/useLongPress";
import {
  Hand,
  Heart,
  Loader2,
  MessageSquare,
  Coffee,
  Sparkles,
  Crown,
  Lightbulb,
  UserMinus,
  Settings,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const { resetUnreadCount } = useNotifications();
  const {
    incomingWaves,
    sendWave,
    hasWavedAt,
    loading: wavesLoading,
  } = useWaves();
  const {
    matches,
    createConversationForMatch,
    loading: matchesLoading,
  } = useMatches();
  const {
    incomingSparks,
    acceptSpark,
    rejectSpark,
    loading: sparksLoading,
  } = useSparks();
  const { cafes } = useCafes();
  const { activeCheckIn } = useActiveCheckIn();
  const [processingWave, setProcessingWave] = useState<string | null>(null);
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);
  const [showSparkPaywall, setShowSparkPaywall] = useState(false);
  const [sparkPaywallTrigger, setSparkPaywallTrigger] = useState<
    "send_limit" | "reveal_sender" | "accept_spark"
  >("reveal_sender");

  // Match deletion state
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [showMatchActionSheet, setShowMatchActionSheet] = useState(false);
  const [deletedMatches, setDeletedMatches] = useState<Set<string>>(new Set());

  const paidFeatures = import.meta.env.VITE_PAYMENTS_ENABLED === "true";
  const loading =
    wavesLoading || matchesLoading || (paidFeatures && sparksLoading);

  const getCafeName = (cafeId: string) => {
    return cafes.find((c) => c.id === cafeId)?.name || "bir kafe";
  };

  const handleWaveBack = async (wave: (typeof incomingWaves)[0]) => {
    // Require active check-in at the same cafe to wave back
    if (!activeCheckIn || activeCheckIn.cafeId !== wave.cafeId) {
      toast.info("El sallamak için önce o kafeye check-in yap ☕");
      return;
    }

    setProcessingWave(wave.id);

    const result = await sendWave(wave.fromUserId, wave.cafeId);

    if (result.success && result.isMatch) {
      toast.success("Eşleştiniz! 🎉", {
        description: "Artık sohbet edebilirsiniz",
      });
      setTimeout(() => navigate("/messages"), 1500);
    } else if (result.success) {
      toast.success("El salladın! 👋");
    }

    setProcessingWave(null);
  };

  const handleOpenChat = async (match: (typeof matches)[0]) => {
    setProcessingMatch(match.id);

    let conversationId = match.conversationId;

    if (!conversationId) {
      conversationId = await createConversationForMatch(match.id);
    }

    setProcessingMatch(null);

    if (conversationId) {
      navigate(`/chat/${conversationId}`);
    } else {
      toast.error("Sohbet açılamadı");
    }
  };

  const handleLongPressMatch = (match: MatchData) => {
    setSelectedMatch(match);
    setShowMatchActionSheet(true);
  };

  const handleUnmatch = () => {
    if (!selectedMatch) return;

    // Add to deleted set (UI only)
    setDeletedMatches((prev) => new Set(prev).add(selectedMatch.id));

    toast.success("Eşleşme bu listede gizlendi", {
      description: "Sayfayı yenilediğinde yeniden görünür.",
    });

    setSelectedMatch(null);
  };

  // Filter out waves from users we've already waved back at (they become matches)
  const pendingWaves = incomingWaves.filter(
    (wave) => !hasWavedAt(wave.fromUserId, wave.cafeId),
  );

  // Filter out deleted matches
  const visibleMatches = matches.filter((m) => !deletedMatches.has(m.id));

  const eventKey =
    incomingWaves.map((w) => w.id).join(",") +
    "|" +
    matches.map((m) => m.id).join(",");
  useEffect(() => {
    if (!loading) void resetUnreadCount("waves");
  }, [loading, eventKey, resetUnreadCount]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-28">
        <header className="flex items-start justify-between gap-3 px-5 pb-5 pt-8">
          <div>
            <h1 className="text-4xl font-extrabold leading-none tracking-tight text-primary">
              Riyo
            </h1>
            <p className="mt-0.5 text-sm font-semibold">Bildirimler</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            aria-label="Bildirim ayarları"
            onClick={() => navigate("/settings/notifications")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </header>
        <main className="mx-auto max-w-[440px]">
          <div className="px-5 pb-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              Bir selamla başlar
            </p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
              Sana gelen <span className="text-primary">selamlar.</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Biri sana el salladığında burada görünür. Karşılıklı selamlaşınca
              eşleşir, Mesajlar'dan sohbet edersiniz.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold">
                {pendingWaves.length} gelen selam
              </span>
              <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                {visibleMatches.length} eşleşme
              </span>
            </div>
          </div>
          <Tabs defaultValue="waves" className="w-full">
            <TabsList
              className={cn(
                "w-full grid mx-5 h-12 rounded-full border border-border/60 bg-card p-1",
                paidFeatures ? "grid-cols-3" : "grid-cols-2",
              )}
              style={{ width: "calc(100% - 2.5rem)" }}
            >
              {paidFeatures && (
                <TabsTrigger
                  value="sparks"
                  className="flex items-center gap-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Sparkles className="w-4 h-4" />
                  İlgiler
                  {incomingSparks.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-full">
                      {incomingSparks.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger
                value="waves"
                className="flex items-center gap-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Hand className="w-4 h-4" />
                Gelen selamlar
                {pendingWaves.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    {pendingWaves.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="flex items-center gap-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Heart className="w-4 h-4" />
                Eşleşmeler
                {visibleMatches.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                    {visibleMatches.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Sparks Tab */}
            <TabsContent value="sparks" className="mt-4 px-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <SparkReceivedList
                  sparks={incomingSparks}
                  onAccept={acceptSpark}
                  onReject={rejectSpark}
                  onShowPaywall={() => {
                    setSparkPaywallTrigger("reveal_sender");
                    setShowSparkPaywall(true);
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="waves" className="mt-4 px-5">
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
                        {/* Avatar - clickable to profile */}
                        <div
                          className="flex-shrink-0 cursor-pointer"
                          onClick={() =>
                            wave.fromUserId &&
                            navigate(`/profile/${wave.fromUserId}`)
                          }
                        >
                          {wave.fromUser?.photoUrl ? (
                            <PrivateProfileImage
                              src={wave.fromUser.photoUrl}
                              alt={wave.fromUser.displayName}
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <InitialsAvatar
                              name={wave.fromUser?.displayName || "Biri"}
                              size="md"
                              className="rounded-full w-14 h-14"
                            />
                          )}
                        </div>

                        {/* Content - name clickable to profile */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-foreground cursor-pointer hover:underline"
                            onClick={() =>
                              wave.fromUserId &&
                              navigate(`/profile/${wave.fromUserId}`)
                            }
                          >
                            {wave.fromUser?.displayName || "Biri"} sana el
                            salladı 👋
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getCafeName(wave.cafeId)} •{" "}
                            {formatDistanceToNow(wave.createdAt, {
                              addSuffix: true,
                              locale: tr,
                            })}
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
                <WavesEmptyState onDiscoverClick={() => navigate("/")} />
              )}
            </TabsContent>

            <TabsContent value="matches" className="mt-4 px-5">
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
                      onViewProfile={() =>
                        match.otherUser?.userId &&
                        navigate(`/profile/${match.otherUser.userId}`)
                      }
                    />
                  ))}
                </div>
              ) : (
                <MatchesEmptyState onDiscoverClick={() => navigate("/")} />
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Match Action Sheet */}
        <MatchActionSheet
          open={showMatchActionSheet}
          onOpenChange={setShowMatchActionSheet}
          userName={selectedMatch?.otherUser?.displayName || ""}
          onUnmatch={handleUnmatch}
        />

        {/* Spark Paywall Modal */}
        <SparkPaywallModal
          isOpen={showSparkPaywall}
          onClose={() => setShowSparkPaywall(false)}
          trigger={sparkPaywallTrigger}
          sparkCount={incomingSparks.length}
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
  onViewProfile,
}: {
  match: MatchData;
  index: number;
  isProcessing: boolean;
  onOpenChat: () => void;
  onLongPress: () => void;
  onViewProfile: () => void;
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
        "active:scale-[0.98] transition-transform",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar - clickable to profile */}
        <div
          className="flex-shrink-0 relative cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile();
          }}
        >
          {match.otherUser?.photoUrl ? (
            <PrivateProfileImage
              src={match.otherUser.photoUrl}
              alt={match.otherUser.displayName}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar
              name={match.otherUser?.displayName || "Biri"}
              size="md"
              className="rounded-full w-14 h-14"
            />
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center border-2 border-card">
            <Heart className="w-3 h-3 text-accent-foreground" />
          </div>
        </div>

        {/* Content - name clickable to profile */}
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-foreground cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile();
            }}
          >
            {match.otherUser?.displayName || "Biri"} ile eşleştin!
          </p>
          <p className="text-sm text-muted-foreground">
            {match.cafe?.name || "bir kafede"} •{" "}
            {formatDistanceToNow(match.createdAt, {
              addSuffix: true,
              locale: tr,
            })}
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
  return <NotificationEmpty kind="waves" onDiscoverClick={onDiscoverClick} />;
}
function MatchesEmptyState({
  onDiscoverClick,
}: {
  onDiscoverClick: () => void;
}) {
  return <NotificationEmpty kind="matches" onDiscoverClick={onDiscoverClick} />;
}
function NotificationEmpty({
  kind,
  onDiscoverClick,
}: {
  kind: "waves" | "matches";
  onDiscoverClick: () => void;
}) {
  const Icon = kind === "waves" ? Hand : Heart;
  return (
    <div className="rounded-3xl border border-border/60 bg-card px-5 py-8 text-center shadow-sm">
      <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-primary">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </span>
      <h3 className="text-xl font-bold">
        {kind === "waves"
          ? "İlk selamın burada görünecek"
          : "Henüz eşleşme yok"}
      </h3>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {kind === "waves"
          ? "Bir mekana check-in yaparak insanlarla tanış. Sana gönderilen selamları alt menüdeki Selamlar bölümünden görebilirsin."
          : "Karşılıklı el salladığınızda burada eşleşirsiniz. Sohbetin Mesajlar bölümünde açılır."}
      </p>
      <Button className="mt-5 rounded-full" onClick={onDiscoverClick}>
        <Coffee className="h-4 w-4" />
        Mekanları keşfet
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Selama karşılık vermek için aynı mekanda aktif olmalısınız.
      </p>
      <PremiumTease />
    </div>
  );
}

// Subtle Premium tease component
function PremiumTease() {
  if (import.meta.env.VITE_PAYMENTS_ENABLED !== "true") return null;
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/subscription")}
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
