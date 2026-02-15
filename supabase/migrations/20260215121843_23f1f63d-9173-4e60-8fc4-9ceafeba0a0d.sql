
-- Fix 1: Drop the trigger that references non-existent user_id column on waves
DROP TRIGGER IF EXISTS prevent_banned_waving ON public.waves;

-- Create a corrected ban check function for waves table
CREATE OR REPLACE FUNCTION public.check_wave_user_not_banned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_user_banned(NEW.from_user_id) THEN
    RAISE EXCEPTION 'User is banned and cannot perform this action';
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create trigger with corrected function
CREATE TRIGGER prevent_banned_waving
BEFORE INSERT ON public.waves
FOR EACH ROW
EXECUTE FUNCTION public.check_wave_user_not_banned();

-- Fix 2: Add unique constraint on profile_views for upsert support
ALTER TABLE public.profile_views
ADD CONSTRAINT profile_views_viewer_viewed_unique 
UNIQUE (viewed_profile_id, viewer_id);
