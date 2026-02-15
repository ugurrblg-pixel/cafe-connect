
-- Create sparks table
CREATE TABLE public.sparks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  cafe_id uuid NOT NULL REFERENCES public.cafes(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  responded_at timestamptz
);

-- Enable RLS
ALTER TABLE public.sparks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can send sparks excluding blocks"
ON public.sparks FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND NOT is_blocked(auth.uid(), to_user_id)
  AND NOT is_blocked(to_user_id, auth.uid())
);

CREATE POLICY "Users can view sparks they sent"
ON public.sparks FOR SELECT
USING (auth.uid() = from_user_id);

CREATE POLICY "Users can view sparks they received"
ON public.sparks FOR SELECT
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can update sparks they received"
ON public.sparks FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Admins can view all sparks"
ON public.sparks FOR SELECT
USING (is_admin(auth.uid()));

-- Function: get daily spark count for a user
CREATE OR REPLACE FUNCTION public.get_daily_spark_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.sparks
  WHERE from_user_id = target_user_id
  AND created_at > now() - interval '24 hours';
$$;

-- Function: check spark daily limit (1 for free, 3 for premium)
CREATE OR REPLACE FUNCTION public.can_send_spark(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN is_premium(target_user_id) THEN
      (SELECT COUNT(*) FROM public.sparks WHERE from_user_id = target_user_id AND created_at > now() - interval '24 hours') < 3
    ELSE
      (SELECT COUNT(*) FROM public.sparks WHERE from_user_id = target_user_id AND created_at > now() - interval '24 hours') < 1
  END;
$$;

-- Function: expire old sparks (can be called periodically or on read)
CREATE OR REPLACE FUNCTION public.expire_stale_sparks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.sparks
  SET status = 'expired'
  WHERE status = 'pending'
  AND (
    expires_at < now()
    OR NOT EXISTS (
      SELECT 1 FROM public.check_ins
      WHERE user_id = sparks.from_user_id
      AND cafe_id = sparks.cafe_id
      AND expiry_time > now()
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.check_ins
      WHERE user_id = sparks.to_user_id
      AND cafe_id = sparks.cafe_id
      AND expiry_time > now()
    )
  );
END;
$$;

-- Enable realtime for sparks
ALTER PUBLICATION supabase_realtime ADD TABLE public.sparks;
