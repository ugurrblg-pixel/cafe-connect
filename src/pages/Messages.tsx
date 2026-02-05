import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useMatches } from '@/hooks/useMatches';
import { MessageSquare, Heart, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const navigate = useNavigate();
  const { matches, createConversationForMatch, loading } = useMatches();
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const handleOpenChat = async (match: typeof matches[0]) => {
    setOpeningChat(match.id);
    
    let conversationId = match.conversationId;
    
    if (!conversationId) {
      conversationId = await createConversationForMatch(match.id);
    }
    
    setOpeningChat(null);
    
    if (conversationId) {
      navigate(`/chat/${conversationId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Messages" />

      <main className="pt-16 px-4">
        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-3 mt-4">
            {matches.map((match, index) => (
              <button
                key={match.id}
                onClick={() => handleOpenChat(match)}
                disabled={openingChat === match.id}
                className="w-full card-elevated p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors text-left animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {match.otherUser?.photoUrl ? (
                    <img
                      src={match.otherUser.photoUrl}
                      alt={match.otherUser.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar 
                      name={match.otherUser?.displayName || 'User'} 
                      size="md" 
                      className="rounded-full w-14 h-14"
                    />
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-card">
                    <Heart className="w-3 h-3 text-accent-foreground" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">
                      {match.otherUser?.displayName || 'User'}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(match.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Matched at {match.cafe?.name || 'a cafe'}
                  </p>
                </div>

                {/* Loading indicator */}
                {openingChat === match.id && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">No matches yet</h3>
            <p className="text-muted-foreground text-center">
              Wave at people in cafes and when they wave back, you can chat!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
