-- Create payments table to store Stripe payment records
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  product_name TEXT,
  payment_type TEXT NOT NULL DEFAULT 'one_time',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (is_admin(auth.uid()));

-- Service role inserts (from webhook)
CREATE POLICY "Service role can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (true);

-- Admins can update payments
CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_stripe_pi ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);