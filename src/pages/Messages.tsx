import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { MessageRequestCard } from '@/components/MessageRequestCard';
import { useConversations } from '@/hooks/useConversations';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { MessageSquare, Inbox, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const navigate = useNavigate();
  const { conversations, loading: convoLoading } = useConversations();
  const { pendingRequests, loading: reqLoading, respondToRequest } = useMessageRequests();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleAccept = async (requestId: string) => {
    setRespondingId(requestId);
    const conversationId = await respondToRequest(requestId, true);
    setRespondingId(null);
    if (conversationId) {
      navigate(`/chat/${conversationId}`);
    }
  };

  const handleReject = async (requestId: string) => {
    setRespondingId(requestId);
    await respondToRequest(requestId, false);
    setRespondingId(null);
  };

  const loading = convoLoading || reqLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Messages" />

      <main className="pt-16">
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Requests
              {pendingRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="mt-2">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : conversations.length > 0 ? (
              <div className="divide-y divide-border">
                {conversations.map((convo, index) => (
                  <button
                    key={convo.id}
                    onClick={() => navigate(`/chat/${convo.id}`)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors text-left animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {convo.otherUser?.photoUrl ? (
                        <img
                          src={convo.otherUser.photoUrl}
                          alt={convo.otherUser.displayName}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar 
                          name={convo.otherUser?.displayName || 'User'} 
                          size="md" 
                          className="rounded-full w-14 h-14"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground">
                          {convo.otherUser?.displayName || 'User'}
                        </h3>
                        {convo.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(convo.lastMessage.createdAt, { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm truncate ${
                          convo.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {convo.lastMessage?.content || 'Start chatting...'}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {convo.unreadCount > 0 && (
                      <div className="min-w-[20px] h-5 bg-primary rounded-full flex items-center justify-center px-1.5">
                        <span className="text-xs text-primary-foreground font-medium">
                          {convo.unreadCount}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No messages yet</h3>
                <p className="text-muted-foreground text-center">
                  Check in at a cafe and start connecting with people nearby!
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-2 px-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="relative">
                    {respondingId === request.id && (
                      <div className="absolute inset-0 bg-background/80 rounded-2xl flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}
                    <MessageRequestCard
                      request={request}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No requests</h3>
                <p className="text-muted-foreground text-center">
                  Message requests from other users will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
