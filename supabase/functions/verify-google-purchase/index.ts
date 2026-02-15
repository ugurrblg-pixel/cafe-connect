import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  purchaseToken: string;
  productId: string;
  userId: string;
  purchaseType?: 'subscription' | 'boost';
}

// Boost product ID → count mapping
const BOOST_COUNTS: Record<string, number> = {
  'cafemeet_boost_1': 1,
  'cafemeet_boost_3': 3,
  'cafemeet_boost_5': 5,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { purchaseToken, productId, userId, purchaseType }: VerifyRequest = await req.json();

    console.log('Verifying purchase:', { productId, userId, purchaseType, hasToken: !!purchaseToken });

    if (!purchaseToken || !productId || !userId) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const packageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');
    const serviceAccountKey = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY');

    if (!packageName || !serviceAccountKey) {
      console.error('Google Play API credentials not configured');
      return new Response(
        JSON.stringify({ verified: false, error: 'Google Play verification not configured. Contact support.', setup_required: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (e) {
      console.error('Invalid service account key format');
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid API configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getGoogleAccessToken(credentials);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Failed to authenticate with Google Play' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isBoost = purchaseType === 'boost' || productId.startsWith('cafemeet_boost_');

    if (isBoost) {
      // Verify consumable product
      const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
      
      const googleResponse = await fetch(verifyUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      const googleData = await googleResponse.json();

      if (googleData.error) {
        console.error('Google Play API error:', googleData.error);
        return new Response(
          JSON.stringify({ verified: false, error: `Verification failed: ${googleData.error.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // purchaseState: 0 = purchased, 1 = canceled
      if (googleData.purchaseState !== 0) {
        return new Response(
          JSON.stringify({ verified: false, error: 'Purchase not completed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add boosts to user
      const boostCount = BOOST_COUNTS[productId] || 1;
      const { data: existing } = await supabase
        .from('boosts')
        .select('remaining_boosts')
        .eq('user_id', userId)
        .maybeSingle();

      const currentBoosts = existing?.remaining_boosts || 0;

      const { error: boostError } = await supabase
        .from('boosts')
        .upsert({
          user_id: userId,
          remaining_boosts: currentBoosts + boostCount,
          platform: 'android',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (boostError) {
        console.error('Boost DB error:', boostError);
        return new Response(
          JSON.stringify({ verified: false, error: 'Failed to add boosts' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Added ${boostCount} boosts for user ${userId}`);
      return new Response(
        JSON.stringify({ verified: true, boostsAdded: boostCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify subscription
    const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
    
    const googleResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    const googleData = await googleResponse.json();

    if (googleData.error) {
      console.error('Google Play API error:', googleData.error);
      return new Response(
        JSON.stringify({ verified: false, error: `Verification failed: ${googleData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiryTime = googleData.expiryTimeMillis ? parseInt(googleData.expiryTimeMillis) : 0;
    const isExpired = expiryTime < Date.now();
    const isCancelled = !googleData.autoRenewing;

    console.log('Subscription verification:', { expiryTime: new Date(expiryTime).toISOString(), isExpired, isCancelled });

    if (isExpired) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Subscription has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planType = productId.includes('yearly') ? 'yearly' : productId.includes('weekly') ? 'weekly' : 'monthly';
    const startedAt = googleData.startTimeMillis ? new Date(parseInt(googleData.startTimeMillis)).toISOString() : new Date().toISOString();
    const expiresAt = new Date(expiryTime).toISOString();

    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType,
        platform: 'android',
        store: 'google_play',
        product_id: productId,
        google_play_purchase_token: purchaseToken,
        google_play_product_id: productId,
        status: isCancelled ? 'cancelled' : 'active',
        started_at: startedAt,
        expires_at: expiresAt,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Database error:', upsertError);
      return new Response(
        JSON.stringify({ verified: false, error: 'Failed to save subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ verified: true, orderId: googleData.orderId, expiresAt, autoRenewing: googleData.autoRenewing }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ verified: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getGoogleAccessToken(credentials: { client_email: string; private_key: string; token_uri?: string }): Promise<string | null> {
  try {
    const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
    const scope = 'https://www.googleapis.com/auth/androidpublisher';
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = { iss: credentials.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      'pkcs8', pemToArrayBuffer(credentials.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsignedToken));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const jwt = `${unsignedToken}.${encodedSignature}`;
    const tokenResponse = await fetch(tokenUri, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenResponse.json();
    return tokenData.access_token || null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
