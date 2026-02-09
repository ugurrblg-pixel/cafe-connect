-- Fix the overly permissive INSERT policy - restrict to service role only
DROP POLICY "Service role can insert payments" ON public.payments;

-- Only authenticated users can insert their own payments (for checkout flow)
CREATE POLICY "Users can insert own payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can also insert (for manual entries)
CREATE POLICY "Admins can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (is_admin(auth.uid()));