import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { sendWaveNotification, sendMatchNotification } from '@/lib/pushNotifications';

interface Wave {
  id: string;
  fromUserId: string;
  toUserId: string;
  cafeId: string;
  createdAt: Date;
  fromUser?: {
    displayName: string;
    photoUrl: string;
  };
}

interface UseWavesReturn {
  incomingWaves: Wave[];
  sentWaves: Wave[];
  loading: boolean;
  sendWave: (toUserId: string, cafeId: string) => Promise<{ success: boolean; isMatch?: boolean }>;
  hasWavedAt: (userId: string, cafeId: string) => boolean;
  hasReceivedWaveFrom: (userId: string, cafeId: string) => boolean;
  refetch: () => Promise<void>;
}

export function useWaves(): UseWavesReturn {
  const { user } = useAuth();
  const [incomingWaves, setIncomingWaves] = useState<Wave[]>([]);
  const [sentWaves, setSentWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWaves = useCallback(async () => {
    if (!user) {
      setIncomingWaves([]);
      setSentWaves([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch waves where user is the recipient (incoming)
      const { data: incoming, error: incomingError } = await supabase
        .from('waves')
        .select('id, from_user_id, to_user_id, cafe_id, created_at')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      // Fetch waves sent by user
      const { data: sent, error: sentError } = await supabase
        .from('waves')
        .select('id, from_user_id, to_user_id, cafe_id, created_at')
        .eq('from_user_id', user.id);

      if (sentError) throw sentError;

      // Get profile info for incoming waves
      if (incoming && incoming.length > 0) {
        const fromUserIds = [...new Set(incoming.map(w => w.from_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, photo_url')
          .in('user_id', fromUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const wavesWithProfiles: Wave[] = incoming.map(w => ({
          id: w.id,
          fromUserId: w.from_user_id,
          toUserId: w.to_user_id,
          cafeId: w.cafe_id,
          createdAt: new Date(w.created_at),
          fromUser: profileMap.get(w.from_user_id) ? {
            displayName: profileMap.get(w.from_user_id)!.display_name || 'Someone',
            photoUrl: profileMap.get(w.from_user_id)!.photo_url || '',
          } : undefined,
        }));

        setIncomingWaves(wavesWithProfiles);
      } else {
        setIncomingWaves([]);
      }

      setSentWaves(
        (sent || []).map(w => ({
          id: w.id,
          fromUserId: w.from_user_id,
          toUserId: w.to_user_id,
          cafeId: w.cafe_id,
          createdAt: new Date(w.created_at),
        }))
      );
    } catch (error) {
      console.error('Error fetching waves:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendWave = useCallback(async (toUserId: string, cafeId: string): Promise<{ success: boolean; isMatch?: boolean }> => {
    if (!user) return { success: false };

    try {
      // Check if already waved
      const existingWave = sentWaves.find(
        w => w.toUserId === toUserId && w.cafeId === cafeId
      );

      if (existingWave) {
        toast.info("You've already waved at this person");
        return { success: false };
      }

      // Create the wave
      const { error: waveError } = await supabase
        .from('waves')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          cafe_id: cafeId,
        });

      if (waveError) {
        if (waveError.code === '23505') {
          toast.info("You've already waved at this person");
          return { success: false };
        }
        throw waveError;
      }

      // Get current user's profile for notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const myName = myProfile?.display_name || 'Birisi';

      // Check if this creates a mutual wave (match)
      const { data: mutualCheck } = await supabase
        .rpc('check_mutual_wave', {
          user_a: user.id,
          user_b: toUserId,
          target_cafe_id: cafeId,
        });

      if (mutualCheck) {
        // Check if match already exists
        const { data: matchExists } = await supabase
          .rpc('match_exists', {
            user_a: user.id,
            user_b: toUserId,
            target_cafe_id: cafeId,
          });

        if (!matchExists) {
          // First create the conversation
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              user1_id: user.id,
              user2_id: toUserId,
              cafe_id: cafeId,
            })
            .select('id')
            .single();

          if (convError) {
            console.error('Error creating conversation:', convError);
            return { success: true, isMatch: true };
          }

          // Create the match with conversation_id
          const { error: matchError } = await supabase
            .from('matches')
            .insert({
              user1_id: user.id,
              user2_id: toUserId,
              cafe_id: cafeId,
              conversation_id: newConversation.id,
            });

          if (matchError && matchError.code !== '23505') {
            console.error('Error creating match:', matchError);
          }

          // Send match notification to the other user
          sendMatchNotification(toUserId, myName, newConversation.id);

          toast.success("It's a match! You can now chat 💬");
        }

        return { success: true, isMatch: true };
      }

      // Send wave notification (not a match yet)
      sendWaveNotification(toUserId, myName);

      await fetchWaves();
      return { success: true, isMatch: false };
    } catch (error) {
      console.error('Error sending wave:', error);
      toast.error('Failed to send wave');
      return { success: false };
    }
  }, [user, sentWaves, fetchWaves]);

  const hasWavedAt = useCallback((userId: string, cafeId: string): boolean => {
    return sentWaves.some(w => w.toUserId === userId && w.cafeId === cafeId);
  }, [sentWaves]);

  const hasReceivedWaveFrom = useCallback((userId: string, cafeId: string): boolean => {
    return incomingWaves.some(w => w.fromUserId === userId && w.cafeId === cafeId);
  }, [incomingWaves]);

  useEffect(() => {
    fetchWaves();
  }, [fetchWaves]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = supabase
      .channel('waves-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waves',
        },
        (payload) => {
          // Refetch on any wave changes that involve this user
          const record = payload.new as { from_user_id?: string; to_user_id?: string } | undefined;
          const oldRecord = payload.old as { from_user_id?: string; to_user_id?: string } | undefined;
          
          if (
            record?.from_user_id === user.id ||
            record?.to_user_id === user.id ||
            oldRecord?.from_user_id === user.id ||
            oldRecord?.to_user_id === user.id
          ) {
            fetchWaves();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWaves]);

  return {
    incomingWaves,
    sentWaves,
    loading,
    sendWave,
    hasWavedAt,
    hasReceivedWaveFrom,
    refetch: fetchWaves,
  };
}
