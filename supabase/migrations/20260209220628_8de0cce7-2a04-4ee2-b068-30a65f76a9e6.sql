
-- Allow admins to view all messages (for moderation)
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to update messages (soft delete)
CREATE POLICY "Admins can update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to update conversations (deactivate)
CREATE POLICY "Admins can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to delete matches
CREATE POLICY "Admins can delete matches"
  ON public.matches FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all profiles (already exists via "Users can view all profiles" but let's ensure)
-- Already covered by existing policy

-- Check-in cooldown function
CREATE OR REPLACE FUNCTION public.check_checkin_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = NEW.user_id
    AND created_at > now() - INTERVAL '5 minutes'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Check-in cooldown: please wait 5 minutes between check-ins';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply cooldown trigger
CREATE TRIGGER enforce_checkin_cooldown
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.check_checkin_cooldown();

-- Ban check on check-in
CREATE OR REPLACE FUNCTION public.check_user_not_banned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF public.is_user_banned(NEW.user_id) THEN
    RAISE EXCEPTION 'User is banned and cannot perform this action';
  END IF;
  RETURN NEW;
END;
$$;

-- Prevent banned users from checking in
CREATE TRIGGER prevent_banned_checkin
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_not_banned();

-- Prevent banned users from sending messages
CREATE TRIGGER prevent_banned_messaging
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_not_banned();

-- Prevent banned users from waving
CREATE TRIGGER prevent_banned_waving
  BEFORE INSERT ON public.waves
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_not_banned();
