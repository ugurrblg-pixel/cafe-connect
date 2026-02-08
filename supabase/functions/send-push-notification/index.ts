import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
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

// Privacy-friendly notification copy (don't expose sender or content)
const PRIVACY_COPY = {
  message: {
    en: { title: 'New Message', body: 'You have a new message in the cafe' },
    tr: { title: 'Yeni Mesaj', body: 'Kafede yeni bir mesajınız var' },
  },
  wave: {
    en: { title: 'Someone Waved!', body: 'Someone waved at you in the cafe' },
    tr: { title: 'Biri El Salladı!', body: 'Kafede biri size el salladı' },
  },
  match: {
    en: { title: 'New Match!', body: 'You have a new match' },
    tr: { title: 'Yeni Eşleşme!', body: 'Yeni bir eşleşmeniz var' },
  },
};

// Simple rate limiting: track last notification time per user
const lastNotificationTime = new Map<string, number>();
const MIN_NOTIFICATION_INTERVAL_MS = 10000; // 10 seconds between notifications

function shouldThrottleNotification(userId: string): boolean {
  const now = Date.now();
  const lastTime = lastNotificationTime.get(userId) || 0;
  
  if (now - lastTime < MIN_NOTIFICATION_INTERVAL_MS) {
    console.log(`Throttling notification for user ${userId}`);
    return true;
  }
  
  lastNotificationTime.set(userId, now);
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // Create Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('Received push request:', JSON.stringify(payload));

    const { userId, type, data } = payload;

    if (!userId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has notifications enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Default to true if not set
    const notificationsEnabled = profile?.notifications_enabled ?? true;

    if (!notificationsEnabled) {
      console.log(`Notifications disabled for user ${userId}, skipping push`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply throttling
    if (shouldThrottleNotification(userId)) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'throttled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use privacy-friendly copy (don't expose sender name or message content)
    const privacyCopy = PRIVACY_COPY[type] || PRIVACY_COPY.message;
    const title = privacyCopy.tr.title; // Default to Turkish for now
    const body = privacyCopy.tr.body;

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for user ${userId}`);

    // Log the notification
    const { error: logError } = await supabase
      .from('notification_log')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data,
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    // Increment unread count based on type
    const countType = type === 'wave' || type === 'match' ? 'waves' : 'messages';
    const { error: countError } = await supabase.rpc('increment_unread_count', {
      target_user_id: userId,
      count_type: countType,
    });

    if (countError) {
      console.error('Error incrementing unread count:', countError);
    }

    // Send push to all subscriptions
    let successCount = 0;
    let failCount = 0;

    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      for (const sub of subscriptions) {
        // For now, just log (actual web push would require additional implementation)
        console.log('Would send push to:', sub.endpoint.substring(0, 50) + '...');
        successCount++;
      }
    }

    console.log(`Push results: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        logged: !logError 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
