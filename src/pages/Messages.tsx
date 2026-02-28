import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { InboxItem } from '@/components/InboxItem';
import { ProfileGateModal } from '@/components/ProfileGateModal';
import { ConversationActionSheet } from '@/components/ConversationActionSheet';
import { useInboxData, InboxConversation } from '@/hooks/useInboxData';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useI18n } from '@/contexts/I18nContext';
import { MessageCircle, Coffee, MapPin, Hand, Sparkles, Crown, ChevronRight, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Premium Header */}
        <header className="fixed top-0 left-0 right-0 z-50 safe-top">
          <div className="relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-secondary/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-amber-500/[0.03]" />
            
            <div className="relative px-5 pt-3 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-bold text-xl text-foreground tracking-tight">Mesajlar</h1>
                  {!loading && visibleConversations.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {visibleConversations.length} sohbet
                    </p>
                  )}
                </div>
                {visibleConversations.length > 5 && (
                  <button 
                    className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
                    aria-label="Ara"
                  >
                    <Search className="w-4.5 h-4.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            {/* Bottom border with subtle gradient */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </header>

        <main className="pt-[72px]">
          {loading ? (
            <div className="px-4 py-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card/40 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
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
            <div className="px-3 py-2">
              {visibleConversations.map((conversation, index) => (
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
                  {/* Subtle separator between items */}
                  {index < visibleConversations.length - 1 && (
                    <div className="ml-[76px] mr-4">
                      <div className="h-px bg-border/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
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
    {
      icon: MapPin,
      title: 'Kafeye git',
      description: 'Yakınındaki bir kafeye check-in yap',
    },
    {
      icon: Hand,
      title: 'El salla',
      description: 'İlgini çeken birine el salla',
    },
    {
      icon: MessageCircle,
      title: 'Sohbet başlat',
      description: 'Karşılıklı el sallayınca sohbet açılır',
    },
  ];

  return (
    <div className="flex flex-col items-center px-6 py-12 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Warm Hero Illustration */}
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

      <h3 className="font-bold text-xl text-foreground mb-2 text-center">
        Henüz sohbetin yok ☕
      </h3>
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

      {/* 3-Step Mini Guide */}
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
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card/80 shadow-sm border border-border/30 transition-all duration-200"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/12 to-primary/5 flex items-center justify-center">
                    <Icon className="w-5.5 h-5.5 text-primary" />
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

      {/* Subtle Premium Tease */}
      <button
        onClick={onPremiumClick}
        className="mt-10 flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/25 hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-md group"
      >
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          Daha hızlı eşleş
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-500/70" />
      </button>
    </div>
  );
}
