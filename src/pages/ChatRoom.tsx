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
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, MoreVertical, Flag, Ban, Loader2, ShieldAlert, ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { BlockDialog, ReportDialog } from '@/components/BlockReportDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OtherUser {
  userId: string;
  displayName: string;
  photoUrl: string;
}

export default function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
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
          displayName: profile.display_name || 'Anonymous',
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

  const handleReport = async (reason: 'spam' | 'harassment' | 'inappropriate', description?: string) => {
    if (!otherUser) return;
    await reportUser(otherUser.userId, reason, description);
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
          <div className="flex items-center gap-3 px-4 py-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex-1 pt-24 p-4">
          <Skeleton className="h-12 w-48 mb-3 rounded-2xl" />
          <Skeleton className="h-12 w-40 ml-auto mb-3 rounded-2xl" />
          <Skeleton className="h-12 w-52 mb-3 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Show blocked/no match state
  if (hasMatch === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
          <div className="flex items-center gap-3 px-4 py-4">
            <button 
              onClick={() => navigate('/messages')} 
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-semibold text-foreground">{t.chat.title}</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <h3 className="font-semibold text-xl text-foreground mb-3">
            {t.chat.chatUnavailable}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            {t.chat.chatUnavailableDesc}
          </p>
          <Button 
            onClick={() => navigate('/messages')} 
            className="mt-8"
            variant="secondary"
          >
            {t.chat.backToMessages}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - cleaner, more minimal */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/messages')} 
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            {otherUser && (
              <div className="flex items-center gap-3">
                {otherUser.photoUrl ? (
                  <img
                    src={otherUser.photoUrl}
                    alt={otherUser.displayName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <InitialsAvatar 
                    name={otherUser.displayName} 
                    size="sm" 
                    className="rounded-full ring-2 ring-background" 
                  />
                )}
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground leading-tight">
                    {otherUser.displayName}
                  </span>
                  {isOtherUserTyping && (
                    <span className="text-xs text-primary font-medium">
                      {t.chat.typing}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem 
                onClick={() => setShowReportDialog(true)} 
                className="text-destructive focus:text-destructive"
              >
                <Flag className="w-4 h-4 mr-2" />
                {t.chat.reportUser}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowBlockDialog(true)} 
                className="text-destructive focus:text-destructive"
              >
                <Ban className="w-4 h-4 mr-2" />
                {t.chat.blockUser}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - improved spacing and layout */}
      <div className="flex-1 pt-20 pb-24 px-4 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyChat otherUserName={otherUser?.displayName || 'User'} />
        ) : (
          <div className="py-4">
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
              <TypingIndicator userName={otherUser?.displayName || 'User'} />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - more refined */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 glass-effect border-t border-border/50">
        <div className="flex items-center gap-3">
          <Input
            ref={inputRef}
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={() => setTyping(false)}
            placeholder={t.chat.typeMessage}
            className="flex-1 rounded-full px-5 py-3 h-12 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            maxLength={500}
          />
          <Button
            onClick={handleSend}
            disabled={!messageInput.trim() || sending}
            size="icon"
            className="w-12 h-12 rounded-full shrink-0"
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
      <BlockDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        userName={otherUser?.displayName || 'User'}
        onConfirm={handleBlock}
      />

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        userName={otherUser?.displayName || 'User'}
        onConfirm={handleReport}
      />
    </div>
  );
}
