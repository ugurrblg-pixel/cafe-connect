
-- 1. Fix profiles: restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. Fix cafes: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view cafes" ON public.cafes;
CREATE POLICY "Authenticated users can view cafes"
ON public.cafes FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. Fix push_subscriptions: restrict service role read
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

-- 4. Fix user_roles: add restrictive policies for mutations
CREATE POLICY "Only super_admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super_admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- 5. Fix cafes: admin-only mutations
CREATE POLICY "Admins can insert cafes"
ON public.cafes FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update cafes"
ON public.cafes FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete cafes"
ON public.cafes FOR DELETE
USING (is_admin(auth.uid()));
