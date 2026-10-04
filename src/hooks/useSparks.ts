import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Spark {
  id: string;
  fromUserId: string;
  toUserId: string;
  cafeId: string;
  status: 'pending' | 'accepted' | 'expired' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
  fromUser?: {
    displayName: string;
    photoUrl: string;
  };
}

interface UseSparksReturn {
  incomingSparks: Spark[];
  sentSparks: Spark[];
  loading: boolean;
  dailySparkCount: number;
  canSendSpark: boolean;
  sparkLimit: number;
  sendSpark: (toUserId: string, cafeId: string) => Promise<{ success: boolean }>;
  acceptSpark: (sparkId: string) => Promise<{ success: boolean; conversationId?: string }>;
  rejectSpark: (sparkId: string) => Promise<boolean>;
  hasSentSparkTo: (userId: string, cafeId: string) => boolean;
  refetch: () => Promise<void>;
}

export function useSparks(): UseSparksReturn {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [incomingSparks, setIncomingSparks] = useState<Spark[]>([]);
  const [sentSparks, setSentSparks] = useState<Spark[]>([]);
  const [dailySparkCount, setDailySparkCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const sparkLimit = isPremium ? 3 : 1;
  const canSendSpark = dailySparkCount < sparkLimit;

  const expireStale = useCallback(async () => {
    try {
      await supabase.rpc('expire_stale_sparks');
    } catch (e) {
      console.error('Error expiring sparks:', e);
    }
  }, []);

  const fetchSparks = useCallback(async () => {
    if (!user) {
      setIncomingSparks([]);
      setSentSparks([]);
      setDailySparkCount(0);
      setLoading(false);
      return;
    }

    try {
      // Expire stale sparks first
      await expireStale();

      // Fetch incoming pending sparks
      const { data: incoming, error: inErr } = await supabase
        .from('sparks')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (inErr) throw inErr;

      // Fetch sent sparks
      const { data: sent, error: sentErr } = await supabase
        .from('sparks')
        .select('*')
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false });

      if (sentErr) throw sentErr;

      // Get daily count
      const { data: count } = await supabase.rpc('get_daily_spark_count', {
        target_user_id: user.id,
      });
      setDailySparkCount(count || 0);

      // Get profiles for incoming sparks
      if (incoming && incoming.length > 0) {
        const fromIds = [...new Set(incoming.map(s => s.from_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, photo_url')
          .in('user_id', fromIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setIncomingSparks(incoming.map(s => ({
          id: s.id,
          fromUserId: s.from_user_id,
          toUserId: s.to_user_id,
          cafeId: s.cafe_id,
          status: s.status as Spark['status'],
          createdAt: new Date(s.created_at),
          expiresAt: new Date(s.expires_at),
          fromUser: profileMap.get(s.from_user_id) ? {
            displayName: profileMap.get(s.from_user_id)!.display_name || 'Birisi',
            photoUrl: profileMap.get(s.from_user_id)!.photo_url || '',
          } : undefined,
        })));
      } else {
        setIncomingSparks([]);
      }

      setSentSparks((sent || []).map(s => ({
        id: s.id,
        fromUserId: s.from_user_id,
        toUserId: s.to_user_id,
        cafeId: s.cafe_id,
        status: s.status as Spark['status'],
        createdAt: new Date(s.created_at),
        expiresAt: new Date(s.expires_at),
      })));
    } catch (error) {
      console.error('Error fetching sparks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, expireStale]);

  const sendSpark = useCallback(async (toUserId: string, cafeId: string): Promise<{ success: boolean }> => {
    if (!user) return { success: false };

    // Check limit via backend
    const { data: allowed } = await supabase.rpc('can_send_spark', {
      target_user_id: user.id,
    });

    if (!allowed) return { success: false };

    const { error } = await supabase
      .from('sparks')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        cafe_id: cafeId,
      });

    if (error) {
      console.error('Error sending spark:', error);
      return { success: false };
    }

    await fetchSparks();
    return { success: true };
  }, [user, fetchSparks]);

  const acceptSpark = useCallback(async (sparkId: string): Promise<{ success: boolean; conversationId?: string }> => {
    if (!user) return { success: false };

    const spark = incomingSparks.find(s => s.id === sparkId);
    if (!spark) return { success: false };

    // Update spark status
    const { error: updateErr } = await supabase
      .from('sparks')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', sparkId);

    if (updateErr) {
      console.error('Error accepting spark:', updateErr);
      return { success: false };
    }

    // Create match
    const { data: newConversation, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user1_id: spark.fromUserId,
        user2_id: user.id,
        cafe_id: spark.cafeId,
      })
      .select('id')
      .single();

    if (convErr) {
      console.error('Error creating conversation:', convErr);
      return { success: true };
    }

    // Create match with conversation
    await supabase.from('matches').insert({
      user1_id: spark.fromUserId,
      user2_id: user.id,
      cafe_id: spark.cafeId,
      conversation_id: newConversation.id,
    });

    await fetchSparks();
    return { success: true, conversationId: newConversation.id };
  }, [user, incomingSparks, fetchSparks]);

  const rejectSpark = useCallback(async (sparkId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('sparks')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', sparkId);

    if (error) {
      console.error('Error rejecting spark:', error);
      return false;
    }

    await fetchSparks();
    return true;
  }, [user, fetchSparks]);

  const hasSentSparkTo = useCallback((userId: string, cafeId: string): boolean => {
    return sentSparks.some(s => s.toUserId === userId && s.cafeId === cafeId && s.status === 'pending');
  }, [sentSparks]);

  useEffect(() => {
    fetchSparks();
  }, [fetchSparks]);

  // Realtime
  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = supabase
      .channel(`sparks-realtime-${user.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sparks',
      }, (payload) => {
        const record = payload.new as { from_user_id?: string; to_user_id?: string } | undefined;
        const oldRecord = payload.old as { from_user_id?: string; to_user_id?: string } | undefined;
        if (
          record?.from_user_id === user.id ||
          record?.to_user_id === user.id ||
          oldRecord?.from_user_id === user.id ||
          oldRecord?.to_user_id === user.id
        ) {
          fetchSparks();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSparks]);

  return {
    incomingSparks,
    sentSparks,
    loading,
    dailySparkCount,
    canSendSpark,
    sparkLimit,
    sendSpark,
    acceptSpark,
    rejectSpark,
    hasSentSparkTo,
    refetch: fetchSparks,
  };
}
