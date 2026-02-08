import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
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
import { toast } from 'sonner';

export default function Messages() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { conversations, loading, createConversation, refetch } = useInboxData();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const [showProfileGate, setShowProfileGate] = useState(false);
  
  // Chat deletion state
  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  // Track deleted conversations locally (UI only)
  const [deletedConversations, setDeletedConversations] = useState<Set<string>>(new Set());

  const handleOpenChat = async (matchId: string, conversationId: string | null) => {
    // Gate messaging behind profile completion
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
    
    // Add to deleted set (UI only)
    setDeletedConversations(prev => new Set(prev).add(selectedConversation.matchId));
    
    toast.success('Sohbet silindi', {
      description: `${selectedConversation.otherUserName} ile sohbet kaldırıldı`,
    });
    
    setSelectedConversation(null);
  };

  // Filter out deleted conversations
  const visibleConversations = conversations.filter(
    c => !deletedConversations.has(c.matchId)
  );

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Mesajlar" />

        <main className="pt-16">
          {loading ? (
            <div className="space-y-1 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleConversations.length > 0 ? (
            <div className="divide-y divide-border/50">
              {visibleConversations.map((conversation) => (
                <InboxItem
                  key={conversation.matchId}
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
              ))}
            </div>
          ) : (
            <MessagesEmptyState onDiscoverClick={() => navigate('/')} onPremiumClick={() => navigate('/subscription')} />
          )}
        </main>

        {/* Profile Gate Modal */}
        <ProfileGateModal
          open={showProfileGate}
          onOpenChange={setShowProfileGate}
          action="message"
        />

        {/* Conversation Action Sheet */}
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

// Empty state component
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
    <div className="flex flex-col items-center px-6 py-10">
      {/* Hero Illustration */}
      <div className="relative mb-6">
        <div className="w-28 h-28 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
          <MessageCircle className="w-14 h-14 text-primary/50" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center border-4 border-background">
          <Coffee className="w-6 h-6 text-amber-600" />
        </div>
      </div>

      {/* Warm Copy */}
      <h3 className="font-semibold text-xl text-foreground mb-2 text-center">
        Sohbetler burada başlıyor
      </h3>
      <p className="text-muted-foreground text-center text-sm max-w-[280px] mb-8 leading-relaxed">
        Bir kafede tanıştığın biriyle eşleştiğinde mesajlaşmaya buradan devam edersin.
      </p>

      {/* Primary CTA */}
      <Button 
        onClick={onDiscoverClick} 
        size="lg"
        className="w-full max-w-[280px] h-14 rounded-2xl text-base font-semibold mb-8"
      >
        <Coffee className="w-5 h-5 mr-2" />
        Kafeleri Keşfet
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>

      {/* 3-Step Mini Guide */}
      <div className="w-full max-w-sm">
        <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wider font-medium">
          Nasıl Çalışır?
        </p>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index}
                className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50"
              >
                {/* Step number with icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle Premium Tease */}
      <button
        onClick={onPremiumClick}
        className="mt-8 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20 hover:border-amber-500/40 transition-all hover:scale-[1.02] group"
      >
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          Daha hızlı eşleş
        </span>
        <Sparkles className="w-3 h-3 text-amber-500/60" />
      </button>
    </div>
  );
}
