import { useRef, useState, useCallback, useEffect } from 'react';

const SCROLL_THRESHOLD = 150; // pixels from bottom to consider "near bottom"

interface UseChatScrollOptions {
  messagesCount: number;
  userId?: string;
  latestSenderId?: string;
}

interface UseChatScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showNewMessageButton: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
  dismissNewMessages: () => void;
}

export function useChatScroll({ 
  messagesCount, 
  userId, 
  latestSenderId 
}: UseChatScrollOptions): UseChatScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const prevMessageCountRef = useRef(messagesCount);
  const userSentMessageRef = useRef(false);

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

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const nearBottom = checkIfNearBottom();
    setIsNearBottom(nearBottom);
    
    // If user scrolled to bottom, dismiss the new message button
    if (nearBottom) {
      setShowNewMessageButton(false);
    }
  }, [checkIfNearBottom]);

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

  // Initial scroll to bottom
  useEffect(() => {
    // Small delay to ensure messages are rendered
    const timer = setTimeout(() => {
      scrollToBottom('instant');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return {
    containerRef,
    messagesEndRef,
    showNewMessageButton,
    scrollToBottom,
    handleScroll,
    dismissNewMessages,
  };
}
