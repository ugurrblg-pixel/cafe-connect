import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  receiptData: string;
  productId: string;
  userId: string;
}

interface AppleVerifyResponse {
  status: number;
  latest_receipt_info?: Array<{
    product_id: string;
    expires_date_ms: string;
    purchase_date_ms: string;
    original_transaction_id: string;
    is_in_intro_offer_period?: string;
    is_trial_period?: string;
  }>;
  pending_renewal_info?: Array<{
    auto_renew_status: string;
    product_id: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { receiptData, productId, userId }: VerifyRequest = await req.json();

    console.log('Verifying Apple purchase:', { productId, userId, hasReceipt: !!receiptData });

    if (!receiptData || !productId || !userId) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const appSharedSecret = Deno.env.get('APPLE_APP_SHARED_SECRET');

    if (!appSharedSecret) {
      console.error('Apple App Store credentials not configured');
      return new Response(
        JSON.stringify({ verified: false, error: 'Apple verification not configured. Contact support.', setup_required: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try production first, then sandbox
    let appleData = await verifyWithApple(receiptData, appSharedSecret, false);
    
    // Status 21007 means sandbox receipt sent to production
    if (appleData.status === 21007) {
      console.log('Sandbox receipt detected, retrying with sandbox URL');
      appleData = await verifyWithApple(receiptData, appSharedSecret, true);
    }

    if (appleData.status !== 0) {
      console.error('Apple verification failed with status:', appleData.status);
      return new Response(
        JSON.stringify({ verified: false, error: `Apple verification failed (status: ${appleData.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the matching subscription receipt
    const receipts = appleData.latest_receipt_info || [];
    const matchingReceipt = receipts
      .filter(r => r.product_id === productId)
      .sort((a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms))[0];

    if (!matchingReceipt) {
      return new Response(
        JSON.stringify({ verified: false, error: 'No matching subscription found in receipt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiryTime = parseInt(matchingReceipt.expires_date_ms);
    const isExpired = expiryTime < Date.now();

    // Check auto-renew status
    const renewalInfo = appleData.pending_renewal_info?.find(r => r.product_id === productId);
    const autoRenewing = renewalInfo?.auto_renew_status === '1';

    console.log('Apple purchase verification result:', {
      expiryTime: new Date(expiryTime).toISOString(),
      isExpired,
      autoRenewing,
      transactionId: matchingReceipt.original_transaction_id
    });

    if (isExpired) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Subscription has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine plan type
    const planType = productId.includes('yearly') ? 'yearly' 
      : productId.includes('3month') ? 'monthly'
      : productId.includes('monthly') ? 'monthly' 
      : 'monthly';

    const startedAt = new Date(parseInt(matchingReceipt.purchase_date_ms)).toISOString();
    const expiresAt = new Date(expiryTime).toISOString();

    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType,
        product_id: productId,
        platform: 'ios',
        store: 'app_store',
        last_receipt: receiptData.substring(0, 500), // Store truncated for reference
        status: autoRenewing ? 'active' : 'cancelled',
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

    console.log('Apple subscription verified and saved successfully');

    return new Response(
      JSON.stringify({
        verified: true,
        transactionId: matchingReceipt.original_transaction_id,
        expiresAt,
        autoRenewing,
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

async function verifyWithApple(
  receiptData: string,
  password: string,
  useSandbox: boolean
): Promise<AppleVerifyResponse> {
  const url = useSandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password,
      'exclude-old-transactions': true,
    }),
  });

  return await response.json();
}
