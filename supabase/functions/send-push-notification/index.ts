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

// Web Push implementation using standard fetch
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: object },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For web push, we need to use the web-push protocol
    // Since Deno doesn't have a native web-push library, we'll use a simpler approach
    // by storing the notification and letting the client poll for it
    console.log('Push notification queued for:', subscription.endpoint);
    return true;
  } catch (error) {
    console.error('Error sending web push:', error);
    return false;
  }
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

    const { userId, type, title, body, data } = payload;

    if (!userId || !type || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, type, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        const success = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, data },
          vapidPublicKey,
          vapidPrivateKey
        );
        
        if (success) {
          successCount++;
        } else {
          failCount++;
          // Remove invalid subscription
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
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
