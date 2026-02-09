import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useConversations';
import { useBlocking } from '@/hooks/useBlocking';
import { useMatches } from '@/hooks/useMatches';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatScroll } from '@/hooks/useChatScroll';
import { usePremium } from '@/hooks/usePremium';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, MoreVertical, Flag, Ban, Loader2, ShieldAlert, ChevronLeft, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { NewMessagesButton } from '@/components/chat/NewMessagesButton';
import { DateSeparator, isDifferentDay } from '@/components/chat/DateSeparator';
import { BlockDialog, ReportDialog } from '@/components/BlockReportDialog';
import { ChatLimitBanner } from '@/components/chat/ChatLimitBanner';
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
  isPremium?: boolean;
}

interface CafeInfo {
  id: string;
  name: string;
}

export default function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { messages, loading, sendMessage, retryMessage, softDeleteMessage } = useChat(conversationId || '');
  const { blockUser, reportUser } = useBlocking();
  const { hasMatchWith, loading: matchesLoading } = useMatches();
  const { resetUnreadCount } = useNotifications();
  const { isPremium } = usePremium();
  
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [cafeInfo, setCafeInfo] = useState<CafeInfo | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [hasMatch, setHasMatch] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Typing indicator with debouncing
  const { isOtherUserTyping, setTyping, hideTypingImmediately } = useTypingIndicator(
    conversationId || '', 
    otherUser?.userId || ''
  );

  // Smart scroll behavior with rejoin support
  const latestMessage = messages[messages.length - 1];
  const {
    containerRef,
    messagesEndRef,
    showNewMessageButton,
    scrollToBottom,
    handleScroll,
    dismissNewMessages,
  } = useChatScroll({
    messagesCount: messages.length,
    userId: user?.id,
    latestSenderId: latestMessage?.senderId,
    conversationId, // Pass for rejoin scroll position restoration
  });

  // Clear message badge when entering chat
  useEffect(() => {
    if (conversationId) {
      resetUnreadCount('messages');
    }
  }, [conversationId, resetUnreadCount]);

  // Fetch other user's info, cafe info, and verify match
  useEffect(() => {
    const fetchConversation = async () => {
      if (!conversationId || !user) return;

      const { data: conv } = await supabase
        .from('conversations')
        .select('user1_id, user2_id, cafe_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (!conv) {
        navigate('/messages');
        return;
      }

      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

      // Fetch profile, check-in, cafe info, and premium status
      const [profileRes, checkInRes, cafeRes, subscriptionRes] = await Promise.all([
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
        supabase
          .from('cafes')
          .select('id, name')
          .eq('id', conv.cafe_id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status, expires_at')
          .eq('user_id', otherUserId)
          .maybeSingle(),
      ]);

      const profile = profileRes.data;
      const checkIn = checkInRes.data;
      const cafe = cafeRes.data;
      const subscription = subscriptionRes.data;
      
      // Check if other user is premium
      const isOtherUserPremium = subscription?.status === 'active' && 
        (!subscription?.expires_at || new Date(subscription.expires_at) > new Date());

      if (profile) {
        setOtherUser({
          userId: profile.user_id,
          displayName: profile.display_name || 'Anonymous',
          photoUrl: profile.photo_url || '',
          lastActiveAt: checkIn?.last_active_at ? new Date(checkIn.last_active_at) : undefined,
          isPremium: isOtherUserPremium,
        });
      }

      if (cafe) {
        setCafeInfo({ id: cafe.id, name: cafe.name });
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

  // Hide typing indicator when message received from other user
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.senderId !== user?.id) {
        hideTypingImmediately();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, user?.id, hideTypingImmediately]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    setTyping(e.target.value.length > 0);
  }, [setTyping]);

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || isSending) return;
    
    const contentToSend = messageInput;
    setMessageInput('');
    setTyping(false);
    setIsSending(true);
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
    
    await sendMessage(contentToSend);
    setIsSending(false);
    
    // Scroll to bottom after sending
    scrollToBottom();
  }, [messageInput, isSending, sendMessage, setTyping, scrollToBottom]);

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
    await reportUser(otherUser.userId, reason, description, conversationId);
    setShowReportDialog(false);
  };

  // Group messages by sender, find last own message, and track date boundaries
  const { groupedMessages, lastOwnMessageId } = useMemo(() => {
    let lastOwnId: string | null = null;
    
    // Find the last own message that is sent (not sending/failed)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user?.id && messages[i].status === 'sent') {
        lastOwnId = messages[i].id;
        break;
      }
    }

    // Sort by createdAt to ensure strict order
    const sortedMessages = [...messages].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    const grouped = sortedMessages.map((message, index) => {
      const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
      const nextMessage = index < sortedMessages.length - 1 ? sortedMessages[index + 1] : null;
      
      const isFirstInGroup = !prevMessage || prevMessage.senderId !== message.senderId;
      const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
      
      // Check if we should show a date separator before this message
      const showDateSeparator = !prevMessage || isDifferentDay(prevMessage.createdAt, message.createdAt);
      
      // Is this the very first message in the conversation?
      const isFirstMessage = index === 0;
      
      return {
        ...message,
        isFirstInGroup,
        isLastInGroup,
        showDateSeparator,
        isFirstMessage,
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
      {/* Header with online status and premium badge */}
      <ChatHeader
        userName={otherUser?.displayName || 'User'}
        userPhotoUrl={otherUser?.photoUrl}
        lastActiveAt={otherUser?.lastActiveAt}
        isTyping={isOtherUserTyping}
        typingText={t.chat.typing}
        onBack={() => navigate('/messages')}
        isPremium={otherUser?.isPremium}
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

      {/* Messages area with scroll handling */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 pt-16 pb-24 px-4 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <EmptyChat 
            otherUserName={otherUser?.displayName || 'User'}
            cafeName={cafeInfo?.name}
            onSuggestionTap={(text) => {
              setMessageInput(text);
              setTyping(true);
              inputRef.current?.focus();
              // Trigger resize for the textarea
              if (inputRef.current) {
                inputRef.current.style.height = 'auto';
              }
            }}
          />
        ) : (
          <div className="py-4">
            {groupedMessages.map((message) => {
              const isOwn = message.senderId === user?.id;
              return (
                <div key={message.clientId || message.id}>
                  {/* Date separator */}
                  {message.showDateSeparator && (
                    <DateSeparator date={message.createdAt} />
                  )}
                  <MessageBubble
                    content={message.content}
                    timestamp={message.createdAt}
                    isOwn={isOwn}
                    isRead={!!message.readAt}
                    readAt={message.readAt}
                    isFirstInGroup={message.isFirstInGroup}
                    isLastInGroup={message.isLastInGroup}
                    isLastOwnMessage={message.id === lastOwnMessageId}
                    isFirstMessage={message.isFirstMessage}
                    isDeleted={!!message.deletedAt}
                    status={message.status}
                    isPremiumSender={!isOwn && otherUser?.isPremium}
                    isPremiumViewer={isPremium}
                    onRetry={message.status === 'failed' && message.clientId ? () => retryMessage(message.clientId!, message.content) : undefined}
                    onDeleteForMe={isOwn && !message.deletedAt ? () => softDeleteMessage(message.id) : undefined}
                    onDeleteForEveryone={isOwn && !message.deletedAt ? () => softDeleteMessage(message.id) : undefined}
                  />
                </div>
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

      {/* New messages button */}
      <NewMessagesButton
        visible={showNewMessageButton}
        onClick={dismissNewMessages}
        label={t.chat.newMessages}
      />

      {/* Chat limit banner for free users */}
      <div className="fixed bottom-20 left-0 right-0 z-40">
        <ChatLimitBanner />
      </div>

      {/* Message input - refined, warm, and modern */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background/98 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
        {/* Premium visibility hint */}
        {isPremium && (
          <div className="flex items-center justify-center gap-1.5 mb-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mesajların daha görünür</span>
          </div>
        )}
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
            placeholder={isPremium ? "Mesajın daha görünür ✨" : "Bir şey yaz..."}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-2xl px-4 py-3.5 text-[15px] border focus:outline-none focus:ring-2 leading-6 max-h-[88px] overflow-y-auto scrollbar-thin transition-all duration-200",
              isPremium 
                ? "bg-amber-500/5 border-amber-500/20 focus:ring-amber-500/30 focus:border-amber-500/40 placeholder:text-amber-600/50 dark:placeholder:text-amber-400/50" 
                : "bg-secondary/70 border-transparent focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/50"
            )}
            maxLength={2000}
          />
          <Button
            onClick={handleSend}
            disabled={!messageInput.trim() || isSending}
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full shrink-0 transition-all duration-300",
              messageInput.trim() && !isSending
                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl scale-100 opacity-100"
                : "bg-muted text-muted-foreground shadow-none scale-90 opacity-50",
              "active:scale-90"
            )}
          >
            {isSending ? (
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