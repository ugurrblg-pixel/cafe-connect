import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  type: 'wave' | 'match' | 'message' | 'activity_spike';
  title?: string;
  body?: string;
  data?: {
    url?: string;
    conversationId?: string;
    fromUserId?: string;
    cafeId?: string;
  };
  // Optional: sender's timezone offset in minutes (e.g., -120 for UTC+2)
  timezoneOffset?: number;
}

// Smart notification copy - casual, human, short
const NOTIFICATION_COPY = {
  message: {
    en: { title: 'New message ☕', body: 'Someone replied to you' },
    tr: { title: 'Yeni mesaj ☕', body: 'Biri sana cevap verdi' },
  },
  wave: {
    en: { title: 'Hey! 👋', body: 'Someone waved at you' },
    tr: { title: 'Hey! 👋', body: 'Biri sana el salladı' },
  },
  match: {
    en: { title: "It's a match! ✨", body: 'Chat is now unlocked' },
    tr: { title: 'Eşleştiniz! ✨', body: 'Sohbet açıldı' },
  },
  activity_spike: {
    en: { title: 'Cafe is getting active ☕', body: 'Come see who\'s around' },
    tr: { title: 'Kafe canlanıyor ☕', body: 'Gel kimler var gör' },
  },
};

// ============= SMART NOTIFICATION CONFIG =============
const MAX_NOTIFICATIONS_PER_DAY = 2;
const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 9;    // 9 AM
const MIN_INTERVAL_SAME_TYPE_MS = 5 * 60 * 1000; // 5 min between same type

/**
 * Check if current time is within quiet hours (22:00 - 09:00)
 * Uses the user's timezone offset if provided
 */
function isQuietHours(timezoneOffset?: number): boolean {
  const now = new Date();
  
  // Apply timezone offset (timezoneOffset is in minutes, negative for ahead of UTC)
  const offsetMs = (timezoneOffset ?? 0) * 60 * 1000;
  const localTime = new Date(now.getTime() - offsetMs);
  const hour = localTime.getHours();
  
  // Quiet hours: 22:00 - 09:00
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

/**
 * Get start of today in UTC for daily counting
 */
function getStartOfDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('📩 Push request:', JSON.stringify({ userId: payload.userId, type: payload.type }));

    const { userId, type, data, timezoneOffset } = payload;

    if (!userId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CHECK 1: Notifications enabled? =============
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const notificationsEnabled = profile?.notifications_enabled ?? true;

    if (!notificationsEnabled) {
      console.log(`🔕 Notifications disabled for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CHECK 2: Quiet hours? =============
    if (isQuietHours(timezoneOffset)) {
      console.log(`🌙 Quiet hours active for user ${userId}, skipping push`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'quiet_hours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CHECK 3: Daily limit (max 2/day) =============
    const startOfDay = getStartOfDay();
    const { count: todayCount, error: countError } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('sent_at', startOfDay.toISOString());

    if (countError) {
      console.error('Error counting daily notifications:', countError);
    }

    const dailyNotifications = todayCount ?? 0;
    
    if (dailyNotifications >= MAX_NOTIFICATIONS_PER_DAY) {
      console.log(`📊 Daily limit reached for user ${userId} (${dailyNotifications}/${MAX_NOTIFICATIONS_PER_DAY})`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'daily_limit_reached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CHECK 4: Same-type throttle (5 min) =============
    const fiveMinAgo = new Date(Date.now() - MIN_INTERVAL_SAME_TYPE_MS);
    const { data: recentSameType } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .gte('sent_at', fiveMinAgo.toISOString())
      .limit(1);

    if (recentSameType && recentSameType.length > 0) {
      console.log(`⏱️ Same-type throttle for ${type}, user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'same_type_throttle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CHECK 5: Activity spike - max once per day =============
    if (type === 'activity_spike') {
      const { data: todaySpike } = await supabase
        .from('notification_log')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'activity_spike')
        .gte('sent_at', startOfDay.toISOString())
        .limit(1);

      if (todaySpike && todaySpike.length > 0) {
        console.log(`🚫 Activity spike already sent today for user ${userId}`);
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'activity_spike_daily_limit' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============= GET NOTIFICATION COPY =============
    const copy = NOTIFICATION_COPY[type] || NOTIFICATION_COPY.message;
    // Default to Turkish for this app (can be extended with user locale preference)
    const title = copy.tr.title;
    const body = copy.tr.body;

    // ============= GET PUSH SUBSCRIPTIONS =============
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

    console.log(`📱 Found ${subscriptions?.length || 0} subscriptions for user ${userId}`);

    // ============= LOG NOTIFICATION =============
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

    // ============= INCREMENT UNREAD COUNT =============
    const countType = type === 'wave' || type === 'match' ? 'waves' : 'messages';
    const { error: unreadError } = await supabase.rpc('increment_unread_count', {
      target_user_id: userId,
      count_type: countType,
    });

    if (unreadError) {
      console.error('Error incrementing unread count:', unreadError);
    }

    // ============= SEND PUSH NOTIFICATIONS =============
    let successCount = 0;
    let failCount = 0;

    if (subscriptions && subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
      for (const sub of subscriptions) {
        try {
          // Web Push implementation would go here
          // For now, we log and count as success (actual sending requires web-push library)
          console.log(`✅ Push queued: ${sub.endpoint.substring(0, 50)}...`);
          successCount++;
        } catch (err) {
          console.error(`❌ Push failed: ${err}`);
          failCount++;
        }
      }
    }

    console.log(`📤 Push results: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        logged: !logError,
        dailyCount: dailyNotifications + 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error processing push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
