import { useRef, useState, useCallback, useEffect } from 'react';

const SCROLL_THRESHOLD = 150; // pixels from bottom to consider "near bottom"
const REJOIN_GRACE_PERIOD = 30000; // 30 seconds - if we return within this, restore scroll position

interface UseChatScrollOptions {
  messagesCount: number;
  userId?: string;
  latestSenderId?: string;
  conversationId?: string;
}

interface UseChatScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showNewMessageButton: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
  dismissNewMessages: () => void;
}

// Session storage key for scroll position
const getScrollKey = (conversationId: string) => `chat-scroll-${conversationId}`;

export function useChatScroll({ 
  messagesCount, 
  userId, 
  latestSenderId,
  conversationId,
}: UseChatScrollOptions): UseChatScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const prevMessageCountRef = useRef(messagesCount);
  const userSentMessageRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);
  const lastLeaveTimeRef = useRef<number | null>(null);

  // Check if user is near the bottom
  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    
    const { scrollHeight, scrollTop, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowNewMessageButton(false);
  }, []);

  // Handle scroll events & save position
  const handleScroll = useCallback(() => {
    const nearBottom = checkIfNearBottom();
    setIsNearBottom(nearBottom);
    
    // If user scrolled to bottom, dismiss the new message button
    if (nearBottom) {
      setShowNewMessageButton(false);
    }

    // Save scroll position for rejoin (only if we have a conversation)
    if (conversationId && containerRef.current) {
      const { scrollTop } = containerRef.current;
      sessionStorage.setItem(getScrollKey(conversationId), JSON.stringify({
        scrollTop,
        timestamp: Date.now(),
      }));
    }
  }, [checkIfNearBottom, conversationId]);

  // Dismiss new messages button
  const dismissNewMessages = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Handle new messages
  useEffect(() => {
    if (messagesCount === prevMessageCountRef.current) return;
    
    const isNewMessage = messagesCount > prevMessageCountRef.current;
    prevMessageCountRef.current = messagesCount;

    if (!isNewMessage) return;

    // If user just sent a message, always scroll to bottom
    if (latestSenderId === userId) {
      userSentMessageRef.current = true;
      scrollToBottom();
      return;
    }

    // If user is near bottom, auto-scroll
    if (isNearBottom) {
      scrollToBottom();
    } else {
      // Show "new messages" button
      setShowNewMessageButton(true);
    }
  }, [messagesCount, userId, latestSenderId, isNearBottom, scrollToBottom]);

  // Initial scroll - try to restore position for rejoin, otherwise scroll to bottom
  useEffect(() => {
    if (hasRestoredScrollRef.current) return;
    hasRestoredScrollRef.current = true;

    // Try to restore scroll position on rejoin
    if (conversationId) {
      const savedData = sessionStorage.getItem(getScrollKey(conversationId));
      if (savedData) {
        try {
          const { scrollTop, timestamp } = JSON.parse(savedData);
          const timeSinceLeave = Date.now() - timestamp;
          
          // Only restore if we left recently (within grace period)
          if (timeSinceLeave < REJOIN_GRACE_PERIOD && containerRef.current) {
            // Wait for messages to render
            const timer = setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = scrollTop;
              }
            }, 150);
            return () => clearTimeout(timer);
          }
        } catch (e) {
          // Invalid saved data, scroll to bottom
        }
      }
    }

    // Default: scroll to bottom
    const timer = setTimeout(() => {
      scrollToBottom('instant');
    }, 100);
    return () => clearTimeout(timer);
  }, [conversationId, scrollToBottom]);

  // Clean up scroll position when navigating away
  useEffect(() => {
    return () => {
      if (conversationId && containerRef.current) {
        const { scrollTop } = containerRef.current;
        sessionStorage.setItem(getScrollKey(conversationId), JSON.stringify({
          scrollTop,
          timestamp: Date.now(),
        }));
      }
    };
  }, [conversationId]);

  return {
    containerRef,
    messagesEndRef,
    showNewMessageButton,
    scrollToBottom,
    handleScroll,
    dismissNewMessages,
  };
}

