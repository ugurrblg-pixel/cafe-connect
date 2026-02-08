import { supabase } from '@/integrations/supabase/client';

interface SendPushParams {
  userId: string;
  type: 'wave' | 'match' | 'message' | 'activity_spike';
  data?: {
    url?: string;
    conversationId?: string;
    fromUserId?: string;
    cafeId?: string;
  };
  // Timezone offset in minutes (from Date.getTimezoneOffset())
  timezoneOffset?: number;
}

/**
 * Get user's timezone offset in minutes
 * Negative values = ahead of UTC (e.g., UTC+2 = -120)
 */
function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

export async function sendPushNotification(params: SendPushParams): Promise<boolean> {
  try {
    // Include timezone offset for quiet hours calculation
    const payload = {
      ...params,
      timezoneOffset: params.timezoneOffset ?? getTimezoneOffset(),
    };

    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    // Log skip reasons for debugging
    if (data?.skipped) {
      console.log(`Push skipped: ${data.reason}`);
    }

    return data?.success ?? false;
  } catch (error) {
    console.error('Error invoking push function:', error);
    return false;
  }
}

// ============= Privacy-safe notification helpers =============
// These do NOT expose sender name or message content in the push payload
// The edge function uses predefined copy for privacy

/**
 * Send wave notification (privacy-safe - no sender name exposed)
 */
export async function sendWaveNotification(
  toUserId: string,
  _fromUserName: string // Kept for backward compat, but not sent
): Promise<boolean> {
  return sendPushNotification({
    userId: toUserId,
    type: 'wave',
    data: { url: '/notifications' },
  });
}

/**
 * Send match notification (privacy-safe)
 */
export async function sendMatchNotification(
  toUserId: string,
  _fromUserName: string, // Not exposed in push
  conversationId?: string
): Promise<boolean> {
  return sendPushNotification({
    userId: toUserId,
    type: 'match',
    data: { 
      url: conversationId ? `/chat/${conversationId}` : '/messages',
      conversationId,
    },
  });
}

/**
 * Send message notification (privacy-safe - no message preview)
 */
export async function sendMessageNotification(
  toUserId: string,
  _fromUserName: string, // Not exposed in push
  conversationId: string,
  _messagePreview?: string // Not exposed in push
): Promise<boolean> {
  return sendPushNotification({
    userId: toUserId,
    type: 'message',
    data: { 
      url: `/chat/${conversationId}`,
      conversationId,
    },
  });
}

/**
 * Send activity spike notification (max once per day per user)
 */
export async function sendActivitySpikeNotification(
  toUserId: string,
  cafeId: string
): Promise<boolean> {
  return sendPushNotification({
    userId: toUserId,
    type: 'activity_spike',
    data: {
      url: `/cafe/${cafeId}`,
      cafeId,
    },
  });
}
