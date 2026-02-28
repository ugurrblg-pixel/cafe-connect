import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { InboxItem } from '@/components/InboxItem';
import { ProfileGateModal } from '@/components/ProfileGateModal';
import { ConversationActionSheet } from '@/components/ConversationActionSheet';
import { useInboxData, InboxConversation } from '@/hooks/useInboxData';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useI18n } from '@/contexts/I18nContext';
import { MessageCircle, Coffee, MapPin, Hand, Sparkles, Crown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Messages() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { conversations, loading, createConversation, refetch } = useInboxData();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const [showProfileGate, setShowProfileGate] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [deletedConversations, setDeletedConversations] = useState<Set<string>>(new Set());

  const handleOpenChat = async (matchId: string, conversationId: string | null) => {
    if (!isProfileComplete) {
      setShowProfileGate(true);
      return;
    }

    setOpeningChat(matchId);
    let convId = conversationId;
    if (!convId) {
      convId = await createConversation(matchId);
    }
    setOpeningChat(null);
    if (convId) {
      navigate(`/chat/${convId}`);
    }
  };

  const handleLongPress = (conversation: InboxConversation) => {
    setSelectedConversation(conversation);
    setShowActionSheet(true);
  };

  const handleDeleteConversation = () => {
    if (!selectedConversation) return;
    setDeletedConversations(prev => new Set(prev).add(selectedConversation.matchId));
    toast.success('Sohbet silindi', {
      description: `${selectedConversation.otherUserName} ile sohbet kaldırıldı`,
    });
    setSelectedConversation(null);
  };

  const visibleConversations = conversations.filter(
    c => !deletedConversations.has(c.matchId)
  );

  // Split: new matches (no messages) vs active chats (have messages)
  const { newMatches, activeChats } = useMemo(() => {
    const newMatches: InboxConversation[] = [];
    const activeChats: InboxConversation[] = [];
    for (const c of visibleConversations) {
      if (!c.lastMessage) {
        newMatches.push(c);
      } else {
        activeChats.push(c);
      }
    }
    return { newMatches, activeChats };
  }, [visibleConversations]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Clean Header */}
        <header className="fixed top-0 left-0 right-0 z-50 safe-top glass-effect border-b border-border/60">
          <div className="flex items-center h-14 px-5">
            <h1 className="font-bold text-lg text-foreground">Mesajlar</h1>
          </div>
        </header>

        <main className="pt-14">
          {loading ? (
            <div className="px-4 py-4 space-y-2">
              {/* Match row skeleton */}
              <div className="flex gap-3 px-1 py-3 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-px bg-border/40 mx-1" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl" style={{ animationDelay: `${i * 100}ms` }}>
                  <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28 rounded-lg" />
                      <Skeleton className="h-3 w-10 rounded-lg" />
                    </div>
                    <Skeleton className="h-3.5 w-44 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleConversations.length > 0 ? (
            <>
              {/* New Matches - Horizontal scroll */}
              {newMatches.length > 0 && (
                <div className="pt-3 pb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 mb-3">
                    Yeni Eşleşmeler
                  </p>
                  <div className="flex gap-4 px-5 overflow-x-auto pb-3 scrollbar-hide">
                    {newMatches.map((match) => (
                      <button
                        key={match.matchId}
                        onClick={() => handleOpenChat(match.matchId, match.conversationId)}
                        disabled={openingChat === match.matchId}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                      >
                        <div className="relative">
                          <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-primary/80 to-amber-500/80 p-[2.5px] shadow-lg group-hover:shadow-xl transition-shadow group-active:scale-95 transition-transform">
                            {match.otherUserPhotoUrl ? (
                              <img
                                src={match.otherUserPhotoUrl}
                                alt={match.otherUserName}
                                className="w-full h-full rounded-full object-cover border-2 border-background"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden">
                                <InitialsAvatar name={match.otherUserName} size="md" className="w-full h-full text-sm" />
                              </div>
                            )}
                          </div>
                          {/* New dot */}
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                            <Sparkles className="w-2 h-2 text-primary-foreground" />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-foreground/80 truncate max-w-[72px]">
                          {match.otherUserName.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* Separator */}
                  <div className="mx-5 h-px bg-border/50" />
                </div>
              )}

              {/* Active Chats */}
              {activeChats.length > 0 ? (
                <div className="px-3 py-2">
                  {activeChats.map((conversation, index) => (
                    <div key={conversation.matchId}>
                      <InboxItem
                        id={conversation.matchId}
                        userName={conversation.otherUserName}
                        userPhotoUrl={conversation.otherUserPhotoUrl}
                        lastMessage={conversation.lastMessage?.content}
                        lastMessageTime={conversation.lastMessage?.createdAt || conversation.matchedAt}
                        cafeName={conversation.cafeName}
                        unreadCount={conversation.unreadCount}
                        lastActiveAt={conversation.lastActiveAt}
                        isLoading={openingChat === conversation.matchId}
                        onClick={() => handleOpenChat(conversation.matchId, conversation.conversationId)}
                        onLongPress={() => handleLongPress(conversation)}
                      />
                      {index < activeChats.length - 1 && (
                        <div className="ml-[76px] mr-4">
                          <div className="h-px bg-border/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Henüz mesajlaşma yok. Yeni eşleşmelerine tıklayarak sohbet başlat!
                  </p>
                </div>
              )}
            </>
          ) : (
            <MessagesEmptyState onDiscoverClick={() => navigate('/')} onPremiumClick={() => navigate('/subscription')} />
          )}
        </main>

        <ProfileGateModal
          open={showProfileGate}
          onOpenChange={setShowProfileGate}
          action="message"
        />

        <ConversationActionSheet
          open={showActionSheet}
          onOpenChange={setShowActionSheet}
          userName={selectedConversation?.otherUserName || ''}
          onDelete={handleDeleteConversation}
        />
      </div>
    </PageLayout>
  );
}

function MessagesEmptyState({ 
  onDiscoverClick, 
  onPremiumClick 
}: { 
  onDiscoverClick: () => void;
  onPremiumClick: () => void;
}) {
  const steps = [
    { icon: MapPin, title: 'Kafeye git', description: 'Yakınındaki bir kafeye check-in yap' },
    { icon: Hand, title: 'El salla', description: 'İlgini çeken birine el salla' },
    { icon: MessageCircle, title: 'Sohbet başlat', description: 'Karşılıklı el sallayınca sohbet açılır' },
  ];

  return (
    <div className="flex flex-col items-center px-6 py-12 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-amber-500/10 to-primary/5 rounded-full blur-2xl scale-150" />
        <div className="relative w-28 h-28 bg-gradient-to-br from-secondary to-secondary/60 rounded-full flex items-center justify-center shadow-lg">
          <MessageCircle className="w-14 h-14 text-primary/50" strokeWidth={1.5} />
          <div className="absolute -top-2 -right-1 w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
        </div>
        <div className="absolute -bottom-2 -right-3 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center border-4 border-background shadow-lg">
          <Coffee className="w-6 h-6 text-white" />
        </div>
      </div>

      <h3 className="font-bold text-xl text-foreground mb-2 text-center">Henüz sohbetin yok ☕</h3>
      <p className="text-muted-foreground text-center text-sm max-w-[280px] mb-8 leading-relaxed">
        Bir kafeye check-in yap, insanlarla tanış ve sohbete başla!
      </p>

      <Button 
        onClick={onDiscoverClick} 
        size="lg"
        className="w-full max-w-[300px] h-13 rounded-2xl text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Coffee className="w-5 h-5 mr-2" />
        Yakındaki Kafeleri Keşfet
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>

      <p className="text-xs text-muted-foreground/70 mt-4 text-center">
        💡 Ne kadar aktif olursan, o kadar hızlı eşleşirsin
      </p>

      <div className="w-full max-w-sm mt-10">
        <p className="text-xs text-muted-foreground text-center mb-5 uppercase tracking-wider font-semibold flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-border" />
          Nasıl Çalışır?
          <span className="w-8 h-px bg-border" />
        </p>
        <div className="space-y-2.5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-card/80 shadow-sm border border-border/30">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/12 to-primary/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[15px]">{step.title}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onPremiumClick}
        className="mt-10 flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/25 hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-md group"
      >
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">Daha hızlı eşleş</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-500/70" />
      </button>
    </div>
  );
}
