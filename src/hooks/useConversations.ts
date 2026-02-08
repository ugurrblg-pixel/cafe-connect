import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { sendMessageNotification } from '@/lib/pushNotifications';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
  deletedAt: Date | null;
  // Optimistic update states
  status?: 'sending' | 'sent' | 'failed';
  clientId?: string; // Client-generated ID for matching optimistic updates
}

// Generate a unique client ID for message deduplication
function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
            deletedAt: lastMsgData.deleted_at ? new Date(lastMsgData.deleted_at) : null,
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

interface ConversationMeta {
  otherUserId: string;
  otherUserName: string;
}

export function useChat(conversationId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationMeta, setConversationMeta] = useState<ConversationMeta | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readChannelRef = useRef<RealtimeChannel | null>(null);

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
        deletedAt: m.deleted_at ? new Date(m.deleted_at) : null,
        status: 'sent' as const,
        clientId: m.client_id,
      }))
    );
    setLoading(false);

    // Mark messages as read immediately when opening conversation
    if (user) {
      markMessagesAsRead();
    }
  };

  // Mark unread messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, user]);

  // Fetch conversation meta (other user info)
  const fetchConversationMeta = async () => {
    if (!conversationId || !user) return;

    const { data: conv } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (!conv) return;

    const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    setConversationMeta({
      otherUserId,
      otherUserName: profile?.display_name || 'Birisi',
    });
  };

  useEffect(() => {
    fetchConversationMeta();
  }, [conversationId, user]);

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
          
          setMessages((prev) => {
            // Check if message already exists by server ID (prevent duplicates)
            const existsByServerId = prev.some(m => m.id === newMsg.id);
            if (existsByServerId) {
              return prev; // Already have this message, skip
            }

            // Check if this matches an optimistic message by client_id
            const existingIndex = prev.findIndex(
              m => m.clientId && newMsg.client_id && m.clientId === newMsg.client_id
            );
            
            if (existingIndex !== -1) {
              // Replace optimistic message with confirmed server message
              const updated = [...prev];
              updated[existingIndex] = {
                id: newMsg.id,
                conversationId: newMsg.conversation_id,
                senderId: newMsg.sender_id,
                content: newMsg.content,
                createdAt: new Date(newMsg.created_at),
                readAt: newMsg.read_at ? new Date(newMsg.read_at) : null,
                deletedAt: newMsg.deleted_at ? new Date(newMsg.deleted_at) : null,
                status: 'sent',
                clientId: newMsg.client_id,
              };
              return updated;
            }
            
            // New message from other user (no matching optimistic message)
            return [
              ...prev,
              {
                id: newMsg.id,
                conversationId: newMsg.conversation_id,
                senderId: newMsg.sender_id,
                content: newMsg.content,
                createdAt: new Date(newMsg.created_at),
                readAt: newMsg.read_at ? new Date(newMsg.read_at) : null,
                deletedAt: newMsg.deleted_at ? new Date(newMsg.deleted_at) : null,
                status: 'sent',
                clientId: newMsg.client_id,
              },
            ];
          });

          // Mark as read if not sender
          if (user && newMsg.sender_id !== user.id) {
            markMessagesAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          
          // Update read status and deletion status for messages
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMsg.id
                ? {
                    ...m,
                    readAt: updatedMsg.read_at ? new Date(updatedMsg.read_at) : null,
                    deletedAt: updatedMsg.deleted_at ? new Date(updatedMsg.deleted_at) : null,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (readChannelRef.current) {
        supabase.removeChannel(readChannelRef.current);
      }
    };
  }, [conversationId, user, markMessagesAsRead]);

  const sendMessage = useCallback(async (content: string, retryClientId?: string): Promise<boolean> => {
    const trimmedContent = content.trim();
    
    // Client-side validation for message length
    if (!user || !conversationId || !trimmedContent) return false;
    
    if (trimmedContent.length > 2000) {
      console.error('Message exceeds maximum length of 2000 characters');
      return false;
    }

    // Use existing clientId for retry, or generate new one
    const clientId = retryClientId || generateClientId();

    // Add optimistic message if not retrying
    if (!retryClientId) {
      const optimisticMessage: Message = {
        id: `temp-${clientId}`,
        clientId,
        conversationId,
        senderId: user.id,
        content: trimmedContent,
        createdAt: new Date(),
        readAt: null,
        deletedAt: null,
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticMessage]);
    } else {
      // Mark existing message as sending again (retry)
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === retryClientId ? { ...m, status: 'sending' as const } : m
        )
      );
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: trimmedContent,
        client_id: clientId, // Send client_id for deduplication
      });

    if (error) {
      console.error('Error sending message:', error);
      // Mark message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: 'failed' as const } : m
        )
      );
      return false;
    }

    // Send push notification to the other user
    if (conversationMeta) {
      sendMessageNotification(
        conversationMeta.otherUserId,
        conversationMeta.otherUserName,
        conversationId,
        trimmedContent
      );
    }

    return true;
  }, [user, conversationId, conversationMeta]);

  const retryMessage = useCallback((clientId: string, content: string) => {
    sendMessage(content, clientId);
  }, [sendMessage]);

  // Soft delete a message (only for own messages)
  const softDeleteMessage = useCallback(async (messageId: string) => {
    if (!user) return false;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, deletedAt: new Date() } : m
      )
    );

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id); // Only allow deleting own messages

    if (error) {
      console.error('Error deleting message:', error);
      // Revert optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deletedAt: null } : m
        )
      );
      return false;
    }

    return true;
  }, [user]);

  return { messages, loading, sendMessage, retryMessage, softDeleteMessage, refetch: fetchMessages };
}
