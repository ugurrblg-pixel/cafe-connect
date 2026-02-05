import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  cafeId: string;
  conversationId: string | null;
  createdAt: Date;
  otherUser?: {
    userId: string;
    displayName: string;
    photoUrl: string;
  };
  cafe?: {
    name: string;
  };
}

interface UseMatchesReturn {
  matches: Match[];
  loading: boolean;
  hasMatchWith: (userId: string) => boolean;
  getMatchConversation: (userId: string) => string | null;
  createConversationForMatch: (matchId: string) => Promise<string | null>;
  refetch: () => Promise<void>;
}

export function useMatches(): UseMatchesReturn {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, cafe_id, conversation_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Get other user IDs and cafe IDs
      const otherUserIds = data.map(m => 
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );
      const cafeIds = [...new Set(data.map(m => m.cafe_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, photo_url')
        .in('user_id', otherUserIds);

      // Fetch cafes
      const { data: cafes } = await supabase
        .from('cafes')
        .select('id, name')
        .in('id', cafeIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const cafeMap = new Map(cafes?.map(c => [c.id, c]) || []);

      const matchesWithDetails: Match[] = data.map(m => {
        const otherUserId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        const profile = profileMap.get(otherUserId);
        const cafe = cafeMap.get(m.cafe_id);

        return {
          id: m.id,
          user1Id: m.user1_id,
          user2Id: m.user2_id,
          cafeId: m.cafe_id,
          conversationId: m.conversation_id,
          createdAt: new Date(m.created_at),
          otherUser: profile ? {
            userId: otherUserId,
            displayName: profile.display_name || 'Someone',
            photoUrl: profile.photo_url || '',
          } : undefined,
          cafe: cafe ? { name: cafe.name } : undefined,
        };
      });

      setMatches(matchesWithDetails);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const hasMatchWith = useCallback((userId: string): boolean => {
    return matches.some(m => m.user1Id === userId || m.user2Id === userId);
  }, [matches]);

  const getMatchConversation = useCallback((userId: string): string | null => {
    const match = matches.find(m => 
      (m.user1Id === userId || m.user2Id === userId)
    );
    return match?.conversationId || null;
  }, [matches]);

  const createConversationForMatch = useCallback(async (matchId: string): Promise<string | null> => {
    if (!user) return null;

    const match = matches.find(m => m.id === matchId);
    if (!match) return null;

    // If conversation already exists, return it
    if (match.conversationId) return match.conversationId;

    try {
      // Create conversation
      const { data: convo, error: convoError } = await supabase
        .from('conversations')
        .insert({
          user1_id: match.user1Id,
          user2_id: match.user2Id,
          cafe_id: match.cafeId,
        })
        .select()
        .single();

      if (convoError) throw convoError;

      // Update match with conversation ID
      const { error: updateError } = await supabase
        .from('matches')
        .update({ conversation_id: convo.id })
        .eq('id', matchId);

      if (updateError) {
        console.error('Error updating match with conversation:', updateError);
      }

      await fetchMatches();
      return convo.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user, matches, fetchMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          const record = payload.new as { user1_id?: string; user2_id?: string } | undefined;
          const oldRecord = payload.old as { user1_id?: string; user2_id?: string } | undefined;
          
          if (
            record?.user1_id === user.id ||
            record?.user2_id === user.id ||
            oldRecord?.user1_id === user.id ||
            oldRecord?.user2_id === user.id
          ) {
            fetchMatches();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMatches]);

  return {
    matches,
    loading,
    hasMatchWith,
    getMatchConversation,
    createConversationForMatch,
    refetch: fetchMatches,
  };
}
