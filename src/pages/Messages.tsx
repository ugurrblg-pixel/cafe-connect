import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { InboxItem } from '@/components/InboxItem';
import { ProfileGateModal } from '@/components/ProfileGateModal';
import { useInboxData } from '@/hooks/useInboxData';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useI18n } from '@/contexts/I18nContext';
import { MessageCircle, Coffee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function Messages() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { conversations, loading, createConversation } = useInboxData();
  const { isComplete: isProfileComplete } = useProfileCompletion();
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const [showProfileGate, setShowProfileGate] = useState(false);

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

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.messages.title} />

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
          ) : conversations.length > 0 ? (
            <div className="divide-y divide-border/50">
              {conversations.map((conversation) => (
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
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              {/* Empty state illustration */}
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-muted/60 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/40" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-primary" />
                </div>
              </div>
              
              <h3 className="font-semibold text-lg text-foreground mb-2">
                {t.messages.emptyInbox}
              </h3>
              <p className="text-muted-foreground text-center text-sm max-w-[260px] mb-6 leading-relaxed">
                {t.messages.emptyInboxDesc}
              </p>
              
              <Button
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <Coffee className="w-4 h-4" />
                {t.messages.findCafes}
              </Button>
            </div>
          )}
        </main>

        {/* Profile Gate Modal */}
        <ProfileGateModal
          open={showProfileGate}
          onOpenChange={setShowProfileGate}
          action="message"
        />
      </div>
    </PageLayout>
  );
}
