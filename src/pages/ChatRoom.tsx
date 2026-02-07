import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { ChatHeader } from '@/components/chat/ChatHeader';
import { BlockDialog, ReportDialog } from '@/components/BlockReportDialog';
import { cn } from '@/lib/utils';
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
  lastActiveAt?: Date;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Typing indicator with debouncing
  const { isOtherUserTyping, setTyping, hideTypingImmediately } = useTypingIndicator(
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

      // Fetch profile and check-in for activity status
      const [profileRes, checkInRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, photo_url')
          .eq('user_id', otherUserId)
          .maybeSingle(),
        supabase
          .from('check_ins')
          .select('last_active_at')
          .eq('user_id', otherUserId)
          .gt('expiry_time', new Date().toISOString())
          .maybeSingle(),
      ]);

      const profile = profileRes.data;
      const checkIn = checkInRes.data;

      if (profile) {
        setOtherUser({
          userId: profile.user_id,
          displayName: profile.display_name || 'Anonymous',
          photoUrl: profile.photo_url || '',
          lastActiveAt: checkIn?.last_active_at ? new Date(checkIn.last_active_at) : undefined,
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

  // Scroll to bottom on new messages and hide typing when message received
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    // Hide typing indicator immediately when a new message arrives from other user
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.senderId !== user?.id) {
        hideTypingImmediately();
      }
    }
    prevMessageCountRef.current = messages.length;
    
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user?.id, hideTypingImmediately]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    setTyping(e.target.value.length > 0);
  }, [setTyping]);

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || sending) return;
    
    setTyping(false);
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
      }
    }
  }, [messageInput, sending, sendMessage, setTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift + Enter will naturally insert a new line
  }, [handleSend]);

  // Auto-resize textarea with max 3 lines
  const handleTextareaResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    const lineHeight = 24; // Approximate line height
    const maxHeight = lineHeight * 3 + 16; // 3 lines + padding
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

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

  // Group messages by sender and find last own message
  const { groupedMessages, lastOwnMessageId } = useMemo(() => {
    let lastOwnId: string | null = null;
    
    // Find the last own message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user?.id) {
        lastOwnId = messages[i].id;
        break;
      }
    }

    const grouped = messages.map((message, index) => {
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

    return { groupedMessages: grouped, lastOwnMessageId: lastOwnId };
  }, [messages, user?.id]);

  // Loading state
  if (loading || matchesLoading) {
    return (
      <div className="min-h-screen bg-secondary/20 flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        <div className="flex-1 pt-24 p-4">
          <Skeleton className="h-12 w-48 mb-2 rounded-[22px]" />
          <Skeleton className="h-10 w-36 mb-4 rounded-[22px]" />
          <Skeleton className="h-12 w-40 ml-auto mb-2 rounded-[22px]" />
          <Skeleton className="h-16 w-52 ml-auto mb-4 rounded-[22px]" />
          <Skeleton className="h-10 w-44 rounded-[22px]" />
        </div>
      </div>
    );
  }

  // Show blocked/no match state
  if (hasMatch === false) {
    return (
      <div className="min-h-screen bg-secondary/20 flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
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
    <div className="min-h-screen bg-secondary/20 flex flex-col">
      {/* Header with online status */}
      <ChatHeader
        userName={otherUser?.displayName || 'User'}
        userPhotoUrl={otherUser?.photoUrl}
        lastActiveAt={otherUser?.lastActiveAt}
        isTyping={isOtherUserTyping}
        typingText={t.chat.typing}
        onBack={() => navigate('/messages')}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors">
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
        }
      />

      {/* Messages area with warm off-white background */}
      <div className="flex-1 pt-16 pb-24 px-4 overflow-y-auto">
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
                  isLastOwnMessage={message.id === lastOwnMessageId}
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

      {/* Message input - refined and warm */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={messageInput}
            onChange={(e) => {
              handleInputChange(e);
              handleTextareaResize(e);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTyping(false)}
            placeholder={t.chat.typeMessage}
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm bg-secondary/60 border-0 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60 leading-6 max-h-[88px] overflow-y-auto scrollbar-thin"
            maxLength={2000}
          />
          <Button
            onClick={handleSend}
            disabled={!messageInput.trim() || sending}
            size="icon"
            className={cn(
              "w-11 h-11 rounded-full shrink-0 transition-all duration-200",
              messageInput.trim() && !sending
                ? "bg-primary text-primary-foreground shadow-md scale-100 opacity-100"
                : "bg-muted text-muted-foreground shadow-none scale-95 opacity-60",
              "active:scale-90"
            )}
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
