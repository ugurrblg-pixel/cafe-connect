import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/hooks/useConversations';
import { useBlocking } from '@/hooks/useBlocking';
import { useMatches } from '@/hooks/useMatches';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, MoreVertical, Flag, Ban, Loader2, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyChat } from '@/components/chat/EmptyChat';
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
  const { hasMatchWith, loading: matchesLoading } = useMatches();
  
  const [messageInput, setMessageInput] = useState('');
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [hasMatch, setHasMatch] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing indicator
  const { isOtherUserTyping, setTyping } = useTypingIndicator(
    conversationId || '', 
    otherUser?.userId || ''
  );

  // Fetch other user's info and verify match
  useEffect(() => {
    const fetchConversation = async () => {
      if (!conversationId || !user) return;

      const { data: conv } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (!conv) {
        navigate('/messages');
        return;
      }

      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, display_name, photo_url')
        .eq('user_id', otherUserId)
        .maybeSingle();

      if (profile) {
        setOtherUser({
          userId: profile.user_id,
          displayName: profile.display_name || 'Anonim',
          photoUrl: profile.photo_url || '',
        });
      }
    };

    fetchConversation();
  }, [conversationId, user, navigate]);

  // Check if match exists
  useEffect(() => {
    if (otherUser && !matchesLoading) {
      setHasMatch(hasMatchWith(otherUser.userId));
    }
  }, [otherUser, hasMatchWith, matchesLoading]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherUserTyping]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    
    setTyping(false);
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
      inputRef.current?.focus();
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

  // Group messages by sender for consecutive message handling
  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      
      const isFirstInGroup = !prevMessage || prevMessage.senderId !== message.senderId;
      const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
      
      return {
        ...message,
        isFirstInGroup,
        isLastInGroup,
      };
    });
  }, [messages]);

  if (loading || matchesLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex-1 pt-20 p-4">
          <Skeleton className="h-12 w-48 mb-3" />
          <Skeleton className="h-12 w-40 ml-auto mb-3" />
          <Skeleton className="h-12 w-52 mb-3" />
        </div>
      </div>
    );
  }

  // Show blocked/no match state
  if (hasMatch === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate('/messages')} className="p-2 -ml-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-foreground">Sohbet</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg text-foreground mb-2">
            Sohbet Kullanılamıyor
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Bu kullanıcıyla eşleşmeniz artık aktif değil. Mesajlaşma için karşılıklı eşleşme gereklidir.
          </p>
          <Button 
            onClick={() => navigate('/messages')} 
            className="mt-6"
            variant="secondary"
          >
            Mesajlara Dön
          </Button>
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
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{otherUser.displayName}</span>
                  {isOtherUserTyping && (
                    <span className="text-xs text-primary animate-pulse">yazıyor...</span>
                  )}
                </div>
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
                Kullanıcıyı Şikayet Et
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                <Ban className="w-4 h-4 mr-2" />
                Kullanıcıyı Engelle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 pt-20 pb-32 px-4 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyChat otherUserName={otherUser?.displayName || 'Kullanıcı'} />
        ) : (
          <div className="space-y-0.5">
            {groupedMessages.map((message) => {
              const isOwn = message.senderId === user?.id;
              return (
                <MessageBubble
                  key={message.id}
                  content={message.content}
                  timestamp={message.createdAt}
                  isOwn={isOwn}
                  isRead={!!message.readAt}
                  isFirstInGroup={message.isFirstInGroup}
                  isLastInGroup={message.isLastInGroup}
                />
              );
            })}
            
            {/* Typing indicator */}
            {isOtherUserTyping && (
              <TypingIndicator userName={otherUser?.displayName || 'Kullanıcı'} />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 glass-effect border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={() => setTyping(false)}
            placeholder="Mesaj yaz..."
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
            <AlertDialogTitle>{otherUser?.displayName} engellensin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kullanıcı size mesaj gönderemez ve kafelerde sizi göremez. Daha sonra ayarlardan engeli kaldırabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
              Engelle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{otherUser?.displayName} şikayet edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu, güvenlik ekibimize inceleme için bir rapor gönderecektir. Lütfen yalnızca topluluk kurallarını ihlal eden kullanıcıları şikayet edin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>
              Şikayet Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
