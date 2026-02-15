
-- Add cafe_id column to profile_views
ALTER TABLE public.profile_views ADD COLUMN IF NOT EXISTS cafe_id uuid REFERENCES public.cafes(id);

-- Create anti-spam trigger: prevent duplicate views within 10 minutes
CREATE OR REPLACE FUNCTION public.check_profile_view_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profile_views
    WHERE viewer_id = NEW.viewer_id
    AND viewed_profile_id = NEW.viewed_profile_id
    AND viewed_at > now() - INTERVAL '10 minutes'
  ) THEN
    -- Update existing record timestamp instead of inserting
    UPDATE public.profile_views
    SET viewed_at = now(), cafe_id = NEW.cafe_id
    WHERE viewer_id = NEW.viewer_id
    AND viewed_profile_id = NEW.viewed_profile_id
    AND viewed_at > now() - INTERVAL '10 minutes';
    RETURN NULL; -- Skip the insert
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_profile_view_spam
BEFORE INSERT ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_view_cooldown();

-- Enable realtime for profile_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;
