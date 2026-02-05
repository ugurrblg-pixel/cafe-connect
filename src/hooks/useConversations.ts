import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
}

interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  cafeId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  otherUser?: {
    id: string;
    userId: string;
    displayName: string;
    photoUrl: string;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        user1_id,
        user2_id,
        cafe_id,
        is_active,
        created_at,
        updated_at
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
      return;
    }

    // Fetch other user profiles and last messages
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conv: any) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

        // Get other user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, photo_url')
          .eq('user_id', otherUserId)
          .maybeSingle();

        // Get last message
        const { data: lastMsgData } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        return {
          id: conv.id,
          user1Id: conv.user1_id,
          user2Id: conv.user2_id,
          cafeId: conv.cafe_id,
          isActive: conv.is_active,
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at),
          otherUser: profileData ? {
            id: profileData.id,
            userId: profileData.user_id,
            displayName: profileData.display_name || 'Anonymous',
            photoUrl: profileData.photo_url || '',
          } : undefined,
          lastMessage: lastMsgData ? {
            id: lastMsgData.id,
            conversationId: lastMsgData.conversation_id,
            senderId: lastMsgData.sender_id,
            content: lastMsgData.content,
            createdAt: new Date(lastMsgData.created_at),
            readAt: lastMsgData.read_at ? new Date(lastMsgData.read_at) : null,
          } : undefined,
          unreadCount: count || 0,
        };
      })
    );

    setConversations(conversationsWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useChat(conversationId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    setMessages(
      (data || []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: new Date(m.created_at),
        readAt: m.read_at ? new Date(m.read_at) : null,
      }))
    );
    setLoading(false);

    // Mark messages as read
    if (user) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    // Subscribe to new messages
    channelRef.current = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderId: newMsg.sender_id,
              content: newMsg.content,
              createdAt: new Date(newMsg.created_at),
              readAt: newMsg.read_at ? new Date(newMsg.read_at) : null,
            },
          ]);

          // Mark as read if not sender
          if (user && newMsg.sender_id !== user.id) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, user]);

  const sendMessage = async (content: string): Promise<boolean> => {
    if (!user || !conversationId || !content.trim()) return false;

    setSending(true);

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      });

    setSending(false);

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    return true;
  };

  return { messages, loading, sending, sendMessage, refetch: fetchMessages };
}
