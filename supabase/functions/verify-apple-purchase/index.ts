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
  purchaseType?: 'subscription' | 'boost';
}

const BOOST_COUNTS: Record<string, number> = {
  'cafemeet_boost_1': 1,
  'cafemeet_boost_3': 3,
  'cafemeet_boost_5': 5,
};

interface AppleVerifyResponse {
  status: number;
  latest_receipt_info?: Array<{
    product_id: string;
    expires_date_ms: string;
    purchase_date_ms: string;
    original_transaction_id: string;
    is_trial_period?: string;
  }>;
  receipt?: {
    in_app?: Array<{
      product_id: string;
      transaction_id: string;
      purchase_date_ms: string;
      quantity: string;
    }>;
  };
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
    const { receiptData, productId, userId, purchaseType }: VerifyRequest = await req.json();

    console.log('Verifying Apple purchase:', { productId, userId, purchaseType, hasReceipt: !!receiptData });

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

    const isBoost = purchaseType === 'boost' || productId.startsWith('cafemeet_boost_');

    if (isBoost) {
      // Verify consumable purchase from receipt
      const inAppPurchases = appleData.receipt?.in_app || [];
      const matchingPurchase = inAppPurchases.find(p => p.product_id === productId);

      if (!matchingPurchase) {
        return new Response(
          JSON.stringify({ verified: false, error: 'Boost purchase not found in receipt' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add boosts
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
          platform: 'ios',
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

    // Subscription verification
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
    const renewalInfo = appleData.pending_renewal_info?.find(r => r.product_id === productId);
    const autoRenewing = renewalInfo?.auto_renew_status === '1';

    if (isExpired) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Subscription has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planType = productId.includes('yearly') ? 'yearly' : productId.includes('weekly') ? 'weekly' : 'monthly';
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
        last_receipt: receiptData.substring(0, 500),
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

async function verifyWithApple(receiptData: string, password: string, useSandbox: boolean): Promise<AppleVerifyResponse> {
  const url = useSandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'receipt-data': receiptData, password, 'exclude-old-transactions': true }),
  });

  return await response.json();
}
