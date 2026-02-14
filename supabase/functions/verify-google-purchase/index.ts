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
}

interface GooglePlayVerifyResponse {
  acknowledgementState?: number;
  consumptionState?: number;
  developerPayload?: string;
  expiryTimeMillis?: string;
  kind?: string;
  orderId?: string;
  paymentState?: number;
  purchaseTimeMillis?: string;
  purchaseType?: number;
  startTimeMillis?: string;
  autoRenewing?: boolean;
  // Error fields
  error?: {
    code: number;
    message: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { purchaseToken, productId, userId }: VerifyRequest = await req.json();

    console.log('Verifying purchase:', { productId, userId, hasToken: !!purchaseToken });

    // Validate required fields
    if (!purchaseToken || !productId || !userId) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ verified: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Google Play API credentials from secrets
    // You need to set these secrets:
    // - GOOGLE_PLAY_PACKAGE_NAME: Your app's package name (e.g., app.lovable.cafehuddle)
    // - GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: JSON key from Google Cloud service account
    const packageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');
    const serviceAccountKey = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY');

    if (!packageName || !serviceAccountKey) {
      console.error('Google Play API credentials not configured');
      
      // For now, return a placeholder response indicating setup is needed
      // DO NOT verify purchases without actual Google Play API verification
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Google Play verification not configured. Contact support.',
          setup_required: true 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse service account credentials
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

    // Get access token using service account
    const accessToken = await getGoogleAccessToken(credentials);
    if (!accessToken) {
      console.error('Failed to get Google API access token');
      return new Response(
        JSON.stringify({ verified: false, error: 'Failed to authenticate with Google Play' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify subscription with Google Play API
    const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
    
    console.log('Calling Google Play API...');
    
    const googleResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const googleData: GooglePlayVerifyResponse = await googleResponse.json();

    if (googleData.error) {
      console.error('Google Play API error:', googleData.error);
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: `Purchase verification failed: ${googleData.error.message}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscription is valid
    const expiryTime = googleData.expiryTimeMillis ? parseInt(googleData.expiryTimeMillis) : 0;
    const isExpired = expiryTime < Date.now();
    const isCancelled = !googleData.autoRenewing;

    console.log('Purchase verification result:', {
      expiryTime: new Date(expiryTime).toISOString(),
      isExpired,
      isCancelled,
      orderId: googleData.orderId
    });

    if (isExpired) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Subscription has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Subscription is valid - update database
    const planType = productId.includes('yearly') ? 'yearly' : 'monthly';
    const startedAt = googleData.startTimeMillis 
      ? new Date(parseInt(googleData.startTimeMillis)).toISOString()
      : new Date().toISOString();
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

    console.log('Subscription verified and saved successfully');

    return new Response(
      JSON.stringify({ 
        verified: true, 
        orderId: googleData.orderId,
        expiresAt,
        autoRenewing: googleData.autoRenewing
      }),
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

/**
 * Get OAuth2 access token using Google service account credentials
 */
async function getGoogleAccessToken(credentials: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string | null> {
  try {
    const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
    const scope = 'https://www.googleapis.com/auth/androidpublisher';

    // Create JWT for service account authentication
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: credentials.client_email,
      scope: scope,
      aud: tokenUri,
      iat: now,
      exp: now + 3600, // 1 hour
    };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Sign with private key
    const privateKey = credentials.private_key;
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(unsignedToken)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${unsignedToken}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token || null;

  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

/**
 * Convert PEM-encoded private key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
