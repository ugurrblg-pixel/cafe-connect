import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  odette: string;
  user_id: string;
  display_name: string;
  photo_url: string;
  purpose: string;
  online_at: string;
}

interface UseRealtimePresenceProps {
  cafeId: string | undefined;
  isCheckedIn: boolean;
  displayName: string;
  photoUrl: string;
  purpose: string;
  onPresenceChange?: (presences: PresenceState[]) => void;
}

export function useRealtimePresence({
  cafeId,
  isCheckedIn,
  displayName,
  photoUrl,
  purpose,
  onPresenceChange,
}: UseRealtimePresenceProps) {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const trackPresence = useCallback(async () => {
    if (!channelRef.current || !user) return;

    await channelRef.current.track({
      user_id: user.id,
      display_name: displayName,
      photo_url: photoUrl,
      purpose,
      online_at: new Date().toISOString(),
    });
  }, [user, displayName, photoUrl, purpose]);

  useEffect(() => {
    if (!cafeId || !user || !isCheckedIn) {
      // Clean up if not checked in
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Create presence channel for this cafe
    const channel = supabase.channel(`cafe-presence-${cafeId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const presences = Object.values(state).flat();
        onPresenceChange?.(presences);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            display_name: displayName,
            photo_url: photoUrl,
            purpose,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [cafeId, user, isCheckedIn, displayName, photoUrl, purpose, onPresenceChange]);

  return { trackPresence };
}
