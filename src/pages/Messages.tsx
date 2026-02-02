import { Header } from '@/components/Header';
import { mockUsers } from '@/data/mockData';
import { MessageSquare } from 'lucide-react';

const mockConversations = [
  {
    user: mockUsers[0],
    lastMessage: 'Hey! Nice to meet you here 👋',
    timestamp: '2m ago',
    unread: true,
  },
  {
    user: mockUsers[1],
    lastMessage: 'The coffee here is amazing!',
    timestamp: '1h ago',
    unread: false,
  },
  {
    user: mockUsers[2],
    lastMessage: 'Would love to chat sometime',
    timestamp: '3h ago',
    unread: false,
  },
];

export default function Messages() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Messages" />

      <main className="pt-16">
        {mockConversations.length > 0 ? (
          <div className="divide-y divide-border">
            {mockConversations.map((convo, index) => (
              <button
                key={convo.user.id}
                className="w-full p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors text-left animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={convo.user.photoUrl}
                    alt={convo.user.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {convo.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-accent rounded-full border-2 border-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{convo.user.name}</h3>
                    <span className="text-xs text-muted-foreground">{convo.timestamp}</span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      convo.unread ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {convo.lastMessage}
                  </p>
                </div>

                {/* Unread indicator */}
                {convo.unread && (
                  <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0" />
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
      </main>
    </div>
  );
}
