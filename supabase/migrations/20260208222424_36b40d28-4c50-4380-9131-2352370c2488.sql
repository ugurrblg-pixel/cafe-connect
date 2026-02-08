-- Subscriptions table to track Google Play subscription status
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  plan_type text NOT NULL DEFAULT 'free', -- 'free', 'monthly', 'yearly'
  google_play_purchase_token text,
  google_play_product_id text,
  status text NOT NULL DEFAULT 'inactive', -- 'active', 'cancelled', 'expired', 'inactive'
  started_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- Profile views table
CREATE TABLE public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viewed_profile_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(viewed_profile_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Policies for profile_views
CREATE POLICY "Users can view who viewed their profile" 
ON public.profile_views FOR SELECT 
USING (auth.uid() = viewed_profile_id);

CREATE POLICY "Users can log profile views" 
ON public.profile_views FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can update their views" 
ON public.profile_views FOR UPDATE 
USING (auth.uid() = viewer_id);

-- Daily chat starts tracking
CREATE TABLE public.daily_chat_starts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  chat_date date NOT NULL DEFAULT CURRENT_DATE,
  chat_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_date)
);

-- Enable RLS
ALTER TABLE public.daily_chat_starts ENABLE ROW LEVEL SECURITY;

-- Policies for daily_chat_starts
CREATE POLICY "Users can view their own chat starts" 
ON public.daily_chat_starts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat starts" 
ON public.daily_chat_starts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat starts" 
ON public.daily_chat_starts FOR UPDATE 
USING (auth.uid() = user_id);

-- Add premium fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hide_last_seen boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS boosted_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS show_read_receipts boolean NOT NULL DEFAULT false;

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION public.is_premium(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = target_user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Function to get daily chat starts count
CREATE OR REPLACE FUNCTION public.get_daily_chat_starts(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT chat_count FROM public.daily_chat_starts
     WHERE user_id = target_user_id AND chat_date = CURRENT_DATE),
    0
  );
$$;

-- Function to increment daily chat starts
CREATE OR REPLACE FUNCTION public.increment_chat_starts(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.daily_chat_starts (user_id, chat_date, chat_count)
  VALUES (target_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, chat_date) DO UPDATE 
  SET chat_count = daily_chat_starts.chat_count + 1,
      updated_at = now()
  RETURNING chat_count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Trigger to update subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update daily_chat_starts updated_at
CREATE TRIGGER update_daily_chat_starts_updated_at
BEFORE UPDATE ON public.daily_chat_starts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();