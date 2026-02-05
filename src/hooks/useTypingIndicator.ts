import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  oderId: string;
  isTyping: boolean;
}

interface UseTypingIndicatorReturn {
  isOtherUserTyping: boolean;
  setTyping: (isTyping: boolean) => void;
}

export function useTypingIndicator(conversationId: string, otherUserId: string): UseTypingIndicatorReturn {
  const { user } = useAuth();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<boolean>(false);

  // Debounced typing broadcast
  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !user) return;
    
    // Only send if status changed
    if (lastTypingRef.current === isTyping) return;
    lastTypingRef.current = isTyping;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping },
    });

    // Auto-stop typing after 3 seconds of inactivity
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current && user) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, isTyping: false },
          });
          lastTypingRef.current = false;
        }
      }, 3000);
    }
  }, [user]);

  useEffect(() => {
    if (!conversationId || !user || !otherUserId) return;

    // Create channel for typing indicator
    channelRef.current = supabase
      .channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload as { userId: string; isTyping: boolean };
        
        if (userId === otherUserId) {
          setIsOtherUserTyping(isTyping);
          
          // Auto-clear after 4 seconds (in case we miss the stop event)
          if (isTyping) {
            setTimeout(() => setIsOtherUserTyping(false), 4000);
          }
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        // Send stop typing on unmount
        if (user) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, isTyping: false },
          });
        }
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user, otherUserId]);

  return { isOtherUserTyping, setTyping };
}
