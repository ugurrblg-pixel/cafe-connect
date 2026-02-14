
-- Add platform/store columns to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'android',
  ADD COLUMN IF NOT EXISTS store text NOT NULL DEFAULT 'google_play',
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS last_receipt text;

-- Create boosts table
CREATE TABLE IF NOT EXISTS public.boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  remaining_boosts integer NOT NULL DEFAULT 0,
  platform text NOT NULL DEFAULT 'android',
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boosts_user_id_key UNIQUE (user_id)
);

-- Enable RLS on boosts
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

-- RLS policies for boosts
CREATE POLICY "Users can view their own boosts" ON public.boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own boosts" ON public.boosts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own boosts" ON public.boosts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all boosts" ON public.boosts FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update boosts" ON public.boosts FOR UPDATE USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_boosts_updated_at BEFORE UPDATE ON public.boosts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
