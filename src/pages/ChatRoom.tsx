import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/hooks/useConversations';
import { useBlocking } from '@/hooks/useBlocking';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, MoreVertical, Flag, Ban, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface OtherUser {
  userId: string;
  displayName: string;
  photoUrl: string;
}

export default function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useChat(conversationId || '');
  const { blockUser, reportUser } = useBlocking();
  
  const [messageInput, setMessageInput] = useState('');
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch other user's info
  useEffect(() => {
    const fetchConversation = async () => {
      if (!conversationId || !user) return;

      const { data: conv } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (!conv) return;

      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, display_name, photo_url')
        .eq('user_id', otherUserId)
        .maybeSingle();

      if (profile) {
        setOtherUser({
          userId: profile.user_id,
          displayName: profile.display_name || 'Anonymous',
          photoUrl: profile.photo_url || '',
        });
      }
    };

    fetchConversation();
  }, [conversationId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBlock = async () => {
    if (!otherUser) return;
    const success = await blockUser(otherUser.userId);
    if (success) {
      navigate('/messages');
    }
    setShowBlockDialog(false);
  };

  const handleReport = async () => {
    if (!otherUser) return;
    await reportUser(otherUser.userId, 'Reported from chat');
    setShowReportDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header title="Chat" showBack />
        <div className="flex-1 pt-16 p-4">
          <Skeleton className="h-12 w-32 mb-4" />
          <Skeleton className="h-16 w-3/4 mb-2" />
          <Skeleton className="h-16 w-2/3 ml-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with user info and menu */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/messages')} className="p-2 -ml-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {otherUser && (
              <div className="flex items-center gap-3">
                {otherUser.photoUrl ? (
                  <img
                    src={otherUser.photoUrl}
                    alt={otherUser.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar name={otherUser.displayName} size="sm" className="rounded-full" />
                )}
                <span className="font-semibold text-foreground">{otherUser.displayName}</span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive">
                <Flag className="w-4 h-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                <Ban className="w-4 h-4 mr-2" />
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 pt-20 pb-32 px-4 overflow-y-auto">
        <div className="space-y-3">
          {messages.map((message) => {
            const isOwn = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={cn(
                    'text-xs mt-1',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 glass-effect border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            maxLength={500}
          />
          <Button
            onClick={handleSend}
            disabled={!messageInput.trim() || sending}
            size="icon"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Block Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {otherUser?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to message you or see you in cafes. You can unblock them later from settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {otherUser?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a report to our safety team for review. Please only report users who violate our community guidelines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>
              Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
