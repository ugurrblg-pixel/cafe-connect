
-- Allow admins to view all reports
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to update reports (for reviewing)
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all check-ins (including expired) for moderation
CREATE POLICY "Admins can view all check_ins"
  ON public.check_ins FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to delete check-ins for moderation
CREATE POLICY "Admins can delete check_ins"
  ON public.check_ins FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to update subscriptions (grant/revoke premium)
CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all conversations (count only, no messages)
CREATE POLICY "Admins can view all conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all matches
CREATE POLICY "Admins can view all matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
