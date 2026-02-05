import { supabase } from '@/integrations/supabase/client';

interface SendPushParams {
  userId: string;
  type: 'wave' | 'match' | 'message';
  title: string;
  body: string;
  data?: {
    url?: string;
    conversationId?: string;
    fromUserId?: string;
  };
}

export async function sendPushNotification(params: SendPushParams): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    console.log('Push notification sent:', data);
    return data?.success ?? false;
  } catch (error) {
    console.error('Error invoking push function:', error);
    return false;
  }
}

// Helper functions for specific notification types
export async function sendWaveNotification(
  toUserId: string,
  fromUserName: string
): Promise<boolean> {
  return sendPushNotification({
    userId: toUserId,
    type: 'wave',
    title: 'Yeni Wave! 👋',
    body: `${fromUserName} sana el salladı`,
    data: { url: '/notifications' },
  });
}

export async function sendMatchNotification(
  toUserId: string,
  fromUserName: string,
  conversationId?: string
): Promise<boolean> {
  return sendPushNotification({
    userId: toUserId,
    type: 'match',
    title: 'Eşleşme! 🎉',
    body: `${fromUserName} ile eşleştin`,
    data: { 
      url: conversationId ? `/chat/${conversationId}` : '/messages',
      conversationId,
    },
  });
}

export async function sendMessageNotification(
  toUserId: string,
  fromUserName: string,
  conversationId: string,
  messagePreview?: string
): Promise<boolean> {
  const preview = messagePreview 
    ? messagePreview.slice(0, 50) + (messagePreview.length > 50 ? '...' : '')
    : 'Yeni mesajın var';

  return sendPushNotification({
    userId: toUserId,
    type: 'message',
    title: fromUserName,
    body: preview,
    data: { 
      url: `/chat/${conversationId}`,
      conversationId,
    },
  });
}
