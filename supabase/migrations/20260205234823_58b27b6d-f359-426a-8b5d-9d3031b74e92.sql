-- Create table to store push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web', -- 'web', 'ios', 'android'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can read all (for sending notifications)
CREATE POLICY "Service role can read all subscriptions"
ON public.push_subscriptions FOR SELECT
TO service_role
USING (true);

-- Create notification log table for tracking
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'wave', 'match', 'message'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notification_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notification_log FOR UPDATE
USING (auth.uid() = user_id);

-- Create unread counts table for badge management
CREATE TABLE public.unread_counts (
  user_id UUID NOT NULL PRIMARY KEY,
  waves INTEGER NOT NULL DEFAULT 0,
  messages INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unread_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unread counts"
ON public.unread_counts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own unread counts"
ON public.unread_counts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unread counts"
ON public.unread_counts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to increment unread count
CREATE OR REPLACE FUNCTION public.increment_unread_count(target_user_id UUID, count_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.unread_counts (user_id, waves, messages)
  VALUES (
    target_user_id,
    CASE WHEN count_type = 'waves' THEN 1 ELSE 0 END,
    CASE WHEN count_type = 'messages' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    waves = CASE WHEN count_type = 'waves' THEN unread_counts.waves + 1 ELSE unread_counts.waves END,
    messages = CASE WHEN count_type = 'messages' THEN unread_counts.messages + 1 ELSE unread_counts.messages END,
    updated_at = now();
END;
$$;

-- Function to reset unread count
CREATE OR REPLACE FUNCTION public.reset_unread_count(target_user_id UUID, count_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.unread_counts
  SET 
    waves = CASE WHEN count_type = 'waves' OR count_type = 'all' THEN 0 ELSE waves END,
    messages = CASE WHEN count_type = 'messages' OR count_type = 'all' THEN 0 ELSE messages END,
    updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;