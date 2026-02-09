import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Authenticate admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    switch (action) {
      case "list-payments": {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const startingAfter = url.searchParams.get("starting_after") || undefined;
        
        const params: Stripe.PaymentIntentListParams = { limit };
        if (startingAfter) params.starting_after = startingAfter;

        const paymentIntents = await stripe.paymentIntents.list(params);

        // Enrich with customer info
        const enriched = await Promise.all(
          paymentIntents.data.map(async (pi) => {
            let customerEmail = null;
            let customerName = null;
            if (pi.customer) {
              try {
                const cust = await stripe.customers.retrieve(pi.customer as string);
                if (!("deleted" in cust) || !cust.deleted) {
                  customerEmail = cust.email;
                  customerName = cust.name;
                }
              } catch { /* ignore */ }
            }
            return {
              id: pi.id,
              amount: pi.amount,
              currency: pi.currency,
              status: pi.status,
              description: pi.description,
              customer_id: pi.customer,
              customer_email: customerEmail,
              customer_name: customerName,
              created: pi.created,
              payment_method_types: pi.payment_method_types,
            };
          })
        );

        return respond({ payments: enriched, has_more: paymentIntents.has_more });
      }

      case "payment-detail": {
        const piId = url.searchParams.get("payment_intent_id");
        if (!piId) return respond({ error: "Missing payment_intent_id" }, 400);

        const pi = await stripe.paymentIntents.retrieve(piId);
        let customerEmail = null;
        let customerName = null;
        let subscriptions: any[] = [];

        if (pi.customer) {
          try {
            const cust = await stripe.customers.retrieve(pi.customer as string);
            if (!("deleted" in cust) || !cust.deleted) {
              customerEmail = cust.email;
              customerName = cust.name;
            }
            const subs = await stripe.subscriptions.list({
              customer: pi.customer as string,
              limit: 5,
            });
            subscriptions = subs.data.map(s => ({
              id: s.id,
              status: s.status,
              current_period_end: s.current_period_end,
              cancel_at_period_end: s.cancel_at_period_end,
            }));
          } catch { /* ignore */ }
        }

        // Check refunds
        const charges = await stripe.charges.list({ payment_intent: pi.id, limit: 1 });
        const charge = charges.data[0];

        return respond({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          description: pi.description,
          customer_id: pi.customer,
          customer_email: customerEmail,
          customer_name: customerName,
          created: pi.created,
          refunded: charge?.refunded || false,
          amount_refunded: charge?.amount_refunded || 0,
          subscriptions,
        });
      }

      case "list-subscriptions": {
        const status = url.searchParams.get("status") || "all";
        const params: Stripe.SubscriptionListParams = { limit: 50 };
        if (status !== "all") params.status = status as Stripe.SubscriptionListParams.Status;

        const subs = await stripe.subscriptions.list(params);

        const enriched = await Promise.all(
          subs.data.map(async (sub) => {
            let customerEmail = null;
            let customerName = null;
            try {
              const cust = await stripe.customers.retrieve(sub.customer as string);
              if (!("deleted" in cust) || !cust.deleted) {
                customerEmail = cust.email;
                customerName = cust.name;
              }
            } catch { /* ignore */ }

            const priceItem = sub.items.data[0];
            return {
              id: sub.id,
              status: sub.status,
              customer_id: sub.customer,
              customer_email: customerEmail,
              customer_name: customerName,
              current_period_start: sub.current_period_start,
              current_period_end: sub.current_period_end,
              cancel_at_period_end: sub.cancel_at_period_end,
              created: sub.created,
              price_id: priceItem?.price?.id,
              product_id: priceItem?.price?.product,
              amount: priceItem?.price?.unit_amount,
              currency: priceItem?.price?.currency,
              interval: priceItem?.price?.recurring?.interval,
            };
          })
        );

        return respond({ subscriptions: enriched, has_more: subs.has_more });
      }

      case "cancel-subscription": {
        const subId = url.searchParams.get("subscription_id");
        if (!subId) return respond({ error: "Missing subscription_id" }, 400);

        const cancelled = await stripe.subscriptions.cancel(subId);

        // Audit log
        await supabase.from("admin_audit_log").insert({
          admin_id: userData.user.id,
          action: "cancel_subscription",
          target_type: "subscription",
          target_id: subId,
          details: { stripe_subscription_id: subId },
        });

        return respond({ success: true, status: cancelled.status });
      }

      case "revenue-stats": {
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - 86400;
        const weekAgo = now - 604800;
        const monthAgo = now - 2592000;

        const [dailyCharges, weeklyCharges, monthlyCharges, refunds] = await Promise.all([
          stripe.charges.list({ created: { gte: dayAgo }, limit: 100 }),
          stripe.charges.list({ created: { gte: weekAgo }, limit: 100 }),
          stripe.charges.list({ created: { gte: monthAgo }, limit: 100 }),
          stripe.refunds.list({ created: { gte: monthAgo }, limit: 100 }),
        ]);

        const sumSucceeded = (charges: Stripe.Charge[]) =>
          charges.filter(c => c.status === "succeeded").reduce((sum, c) => sum + c.amount, 0);

        return respond({
          daily_revenue: sumSucceeded(dailyCharges.data),
          weekly_revenue: sumSucceeded(weeklyCharges.data),
          monthly_revenue: sumSucceeded(monthlyCharges.data),
          daily_count: dailyCharges.data.filter(c => c.status === "succeeded").length,
          weekly_count: weeklyCharges.data.filter(c => c.status === "succeeded").length,
          monthly_count: monthlyCharges.data.filter(c => c.status === "succeeded").length,
          refund_count: refunds.data.length,
          refund_amount: refunds.data.reduce((sum, r) => sum + (r.amount || 0), 0),
        });
      }

      default:
        return respond({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("[ADMIN-PAYMENTS] Error:", error);
    return respond({ error: error.message }, 500);
  }
});

function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
