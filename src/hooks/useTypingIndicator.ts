import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

// Timing constants for natural typing feel
const TYPING_SHOW_DELAY_MS = 400;    // Wait before showing typing
const TYPING_HIDE_DELAY_MS = 1200;   // Wait before hiding after stop
const TYPING_BROADCAST_THROTTLE_MS = 2000; // Auto-stop after inactivity

interface UseTypingIndicatorReturn {
  isOtherUserTyping: boolean;
  setTyping: (isTyping: boolean) => void;
  hideTypingImmediately: () => void;
}

export function useTypingIndicator(conversationId: string, otherUserId: string): UseTypingIndicatorReturn {
  const { user } = useAuth();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingRef = useRef<boolean>(false);
  
  // Timers for debouncing
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Internal state to track raw typing signal
  const rawTypingRef = useRef<boolean>(false);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Immediately hide typing indicator (called when message received)
  const hideTypingImmediately = useCallback(() => {
    clearAllTimers();
    rawTypingRef.current = false;
    setIsOtherUserTyping(false);
  }, [clearAllTimers]);

  // Handle incoming typing signals with debouncing
  const handleTypingSignal = useCallback((isTyping: boolean) => {
    rawTypingRef.current = isTyping;

    if (isTyping) {
      // Clear any pending hide timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      // Only start show timer if not already showing and no pending show
      if (!isOtherUserTyping && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          // Only show if still typing after delay
          if (rawTypingRef.current) {
            setIsOtherUserTyping(true);
          }
          showTimerRef.current = null;
        }, TYPING_SHOW_DELAY_MS);
      }
    } else {
      // Clear any pending show timer
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      // Start hide timer with delay
      if (isOtherUserTyping && !hideTimerRef.current) {
        hideTimerRef.current = setTimeout(() => {
          // Only hide if still not typing after delay
          if (!rawTypingRef.current) {
            setIsOtherUserTyping(false);
          }
          hideTimerRef.current = null;
        }, TYPING_HIDE_DELAY_MS);
      }
    }
  }, [isOtherUserTyping, clearAllTimers]);

  // Send typing status (debounced)
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

    // Auto-stop typing after throttle period
    if (isTyping) {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      autoStopTimerRef.current = setTimeout(() => {
        if (channelRef.current && user && lastTypingRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, isTyping: false },
          });
          lastTypingRef.current = false;
        }
      }, TYPING_BROADCAST_THROTTLE_MS);
    } else {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
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
          handleTypingSignal(isTyping);
        }
      })
      .subscribe();

    return () => {
      // Cleanup
      clearAllTimers();
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      
      if (channelRef.current) {
        // Send stop typing on unmount
        if (user && lastTypingRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, isTyping: false },
          });
        }
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, user, otherUserId, handleTypingSignal, clearAllTimers]);

  return { isOtherUserTyping, setTyping, hideTypingImmediately };
}
