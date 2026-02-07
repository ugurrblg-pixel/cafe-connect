import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface InboxConversation {
  matchId: string;
  conversationId: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoUrl: string;
  cafeName: string;
  cafeId: string;
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderId: string;
  };
  unreadCount: number;
  matchedAt: Date;
  lastActiveAt?: Date;
}

export function useInboxData() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchInboxData = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch matches with conversation IDs
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, cafe_id, conversation_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (matchError) throw matchError;
      if (!matches || matches.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get all other user IDs
      const otherUserIds = matches.map(m => 
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );
      const cafeIds = [...new Set(matches.map(m => m.cafe_id))];
      const conversationIds = matches
        .filter(m => m.conversation_id)
        .map(m => m.conversation_id as string);

      // Parallel fetches
      const [profilesRes, cafesRes, checkInsRes, messagesRes, unreadRes] = await Promise.all([
        // Profiles
        supabase
          .from('profiles')
          .select('user_id, display_name, photo_url')
          .in('user_id', otherUserIds),
        
        // Cafes
        supabase
          .from('cafes')
          .select('id, name')
          .in('id', cafeIds),
        
        // Check-ins for activity status
        supabase
          .from('check_ins')
          .select('user_id, last_active_at')
          .in('user_id', otherUserIds)
          .gt('expiry_time', new Date().toISOString()),
        
        // Last messages for each conversation
        conversationIds.length > 0 
          ? supabase
              .from('messages')
              .select('conversation_id, content, created_at, sender_id')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        
        // Unread counts
        conversationIds.length > 0
          ? supabase
              .from('messages')
              .select('conversation_id', { count: 'exact' })
              .in('conversation_id', conversationIds)
              .neq('sender_id', user.id)
              .is('read_at', null)
          : Promise.resolve({ data: [], count: 0 }),
      ]);

      // Build lookup maps
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const cafeMap = new Map(cafesRes.data?.map(c => [c.id, c]) || []);
      const checkInMap = new Map(checkInsRes.data?.map(c => [c.user_id, c]) || []);
      
      // Group messages by conversation and get the latest
      const lastMessageMap = new Map<string, { content: string; createdAt: Date; senderId: string }>();
      (messagesRes.data || []).forEach((msg: any) => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, {
            content: msg.content,
            createdAt: new Date(msg.created_at),
            senderId: msg.sender_id,
          });
        }
      });

      // Calculate unread counts per conversation
      const unreadCountMap = new Map<string, number>();
      if (conversationIds.length > 0) {
        // Fetch unread counts individually for accuracy
        await Promise.all(
          conversationIds.map(async (convId) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', convId)
              .neq('sender_id', user.id)
              .is('read_at', null);
            unreadCountMap.set(convId, count || 0);
          })
        );
      }

      // Build conversations list
      const inboxData: InboxConversation[] = matches.map(match => {
        const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        const profile = profileMap.get(otherUserId);
        const cafe = cafeMap.get(match.cafe_id);
        const checkIn = checkInMap.get(otherUserId);
        const lastMsg = match.conversation_id ? lastMessageMap.get(match.conversation_id) : undefined;
        const unread = match.conversation_id ? unreadCountMap.get(match.conversation_id) || 0 : 0;

        return {
          matchId: match.id,
          conversationId: match.conversation_id,
          otherUserId,
          otherUserName: profile?.display_name || 'Someone',
          otherUserPhotoUrl: profile?.photo_url || '',
          cafeName: cafe?.name || 'Unknown Cafe',
          cafeId: match.cafe_id,
          lastMessage: lastMsg,
          unreadCount: unread,
          matchedAt: new Date(match.created_at),
          lastActiveAt: checkIn?.last_active_at ? new Date(checkIn.last_active_at) : undefined,
        };
      });

      // Sort by: unread first, then by last message time or match time
      inboxData.sort((a, b) => {
        // Unread first
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        
        // Then by most recent activity
        const aTime = a.lastMessage?.createdAt || a.matchedAt;
        const bTime = b.lastMessage?.createdAt || b.matchedAt;
        return bTime.getTime() - aTime.getTime();
      });

      setConversations(inboxData);
    } catch (error) {
      console.error('Error fetching inbox data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create conversation for a match
  const createConversation = useCallback(async (matchId: string): Promise<string | null> => {
    if (!user) return null;

    const match = conversations.find(c => c.matchId === matchId);
    if (!match) return null;
    if (match.conversationId) return match.conversationId;

    try {
      const { data: convo, error } = await supabase
        .from('conversations')
        .insert({
          user1_id: user.id,
          user2_id: match.otherUserId,
          cafe_id: match.cafeId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update match with conversation ID
      await supabase
        .from('matches')
        .update({ conversation_id: convo.id })
        .eq('id', matchId);

      await fetchInboxData();
      return convo.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user, conversations, fetchInboxData]);

  useEffect(() => {
    fetchInboxData();
  }, [fetchInboxData]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel('inbox-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchInboxData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchInboxData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        fetchInboxData();
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchInboxData]);

  return {
    conversations,
    loading,
    createConversation,
    refetch: fetchInboxData,
  };
}
