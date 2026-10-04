import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MessageRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  cafeId: string;
  presetMessage: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  fromProfile?: {
    display_name: string;
    photo_url: string;
  };
}

const PRESET_MESSAGES = [
  "Hey! Would you like to chat?",
  "Hi there! Mind if I join you?",
  "Hello! I noticed you're here too. Want to connect?",
  "Hey! Looking for someone to chat with?",
];

const MAX_REQUESTS_PER_HOUR = 10;

export function useMessageRequests() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<MessageRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('message_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        cafe_id,
        preset_message,
        status,
        created_at,
        profiles!message_requests_from_user_id_fkey (
          display_name,
          photo_url
        )
      `)
      .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching message requests:', error);
      setLoading(false);
      return;
    }

    const requests = (data || []).map((r: any) => ({
      id: r.id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      cafeId: r.cafe_id,
      presetMessage: r.preset_message,
      status: r.status,
      createdAt: new Date(r.created_at),
      fromProfile: r.profiles ? {
        display_name: r.profiles.display_name,
        photo_url: r.profiles.photo_url,
      } : undefined,
    }));

    setPendingRequests(requests.filter(r => r.toUserId === user.id));
    setSentRequests(requests.filter(r => r.fromUserId === user.id));
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    fetchRequests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`message-requests-${user.id}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendRequest = async (toUserId: string, cafeId: string, presetMessage: string): Promise<boolean> => {
    if (!user) return false;

    // Check rate limit
    const { data: countData } = await supabase.rpc('count_recent_message_requests', {
      user_id: user.id,
    });

    if (countData && countData >= MAX_REQUESTS_PER_HOUR) {
      toast.error('Too many requests', {
        description: 'Please wait before sending more message requests.',
      });
      return false;
    }

    // Check if already sent a request to this user
    const existingRequest = sentRequests.find(
      r => r.toUserId === toUserId && r.cafeId === cafeId
    );
    if (existingRequest) {
      toast.error('Request already sent to this user');
      return false;
    }

    // Check if blocked
    const { data: isBlocked } = await supabase.rpc('is_blocked', {
      checker_id: user.id,
      target_id: toUserId,
    });

    if (isBlocked) {
      toast.error('Cannot send request to this user');
      return false;
    }

    const { error } = await supabase
      .from('message_requests')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        cafe_id: cafeId,
        preset_message: presetMessage,
      });

    if (error) {
      console.error('Error sending message request:', error);
      toast.error('Failed to send request');
      return false;
    }

    toast.success('Message request sent!');
    return true;
  };

  const respondToRequest = async (requestId: string, accept: boolean): Promise<string | null> => {
    if (!user) return null;

    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return null;

    const { error: updateError } = await supabase
      .from('message_requests')
      .update({
        status: accept ? 'accepted' : 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      toast.error('Failed to respond to request');
      return null;
    }

    if (accept) {
      // First create a match (required for conversation creation)
      const { error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: request.fromUserId,
          user2_id: user.id,
          cafe_id: request.cafeId,
        });

      if (matchError && matchError.code !== '23505') {
        console.error('Error creating match:', matchError);
        toast.error('Failed to create match');
        return null;
      }

      // Create conversation (RLS now requires match to exist)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user1_id: request.fromUserId,
          user2_id: user.id,
          cafe_id: request.cafeId,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        toast.error('Failed to create conversation');
        return null;
      }

      // Update match with conversation_id
      await supabase
        .from('matches')
        .update({ conversation_id: conversation.id })
        .eq('user1_id', request.fromUserId)
        .eq('user2_id', user.id);

      // Send the preset message as first message
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: request.fromUserId,
          content: request.presetMessage,
        });

      toast.success('Request accepted! You can now chat.');
      return conversation.id;
    } else {
      toast.info('Request declined');
      return null;
    }
  };

  return {
    pendingRequests,
    sentRequests,
    loading,
    sendRequest,
    respondToRequest,
    presetMessages: PRESET_MESSAGES,
    refetch: fetchRequests,
  };
}
