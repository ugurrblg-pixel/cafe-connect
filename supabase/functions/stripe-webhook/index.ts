import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[WEBHOOK] Event received: ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await upsertPayment(pi, "succeeded");
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await upsertPayment(pi, "failed");
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await supabase
            .from("payments")
            .update({ status: "refunded" })
            .eq("stripe_payment_intent_id", charge.payment_intent);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[WEBHOOK] Error processing ${event.type}:`, err);
    return new Response("Processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function upsertPayment(pi: Stripe.PaymentIntent, status: string) {
  const userId = await findUserByCustomer(pi.customer as string);
  if (!userId) {
    console.log("[WEBHOOK] No user found for customer:", pi.customer);
    return;
  }

  const { error } = await supabase
    .from("payments")
    .upsert({
      user_id: userId,
      stripe_payment_intent_id: pi.id,
      stripe_customer_id: pi.customer as string,
      amount: pi.amount,
      currency: pi.currency,
      status,
      product_name: pi.description || "Payment",
      payment_type: "one_time",
    }, { onConflict: "stripe_payment_intent_id" });

  if (error) console.error("[WEBHOOK] Payment upsert error:", error);
  else console.log(`[WEBHOOK] Payment ${status}: ${pi.id}`);
}

async function handleSubscription(sub: Stripe.Subscription) {
  const userId = await findUserByCustomer(sub.customer as string);
  if (!userId) return;

  const productName = sub.items.data[0]?.price?.product
    ? `Subscription`
    : "Subscription";

  // Update subscriptions table
  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: sub.status === "active" ? "active" : "inactive",
      plan_type: "premium",
      started_at: new Date(sub.start_date * 1000).toISOString(),
      expires_at: new Date(sub.current_period_end * 1000).toISOString(),
    }, { onConflict: "user_id" });

  if (subError) console.error("[WEBHOOK] Subscription upsert error:", subError);
  else console.log(`[WEBHOOK] Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = await findUserByCustomer(sub.customer as string);
  if (!userId) return;

  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "active");

  console.log(`[WEBHOOK] Subscription cancelled for user ${userId}`);
}

async function findUserByCustomer(customerId: string): Promise<string | null> {
  if (!customerId) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !("email" in customer) || !customer.email) return null;

    const { data } = await supabase.auth.admin.listUsers();
    const user = data?.users?.find(u => u.email === customer.email);
    return user?.id || null;
  } catch {
    return null;
  }
}
