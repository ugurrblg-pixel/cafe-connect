-- Applied to xbodyzqtltrdtdahrteh after explicit user approval, 2026-10-09.
-- Scope: signed-in users can read/update their OWN profile and read cafes.
-- Anonymous access, photos, chat, matching and payments stay closed.
BEGIN;
-- Eliminate broad legacy profile SELECT policies before enabling reads.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
-- Existing own-profile SELECT/UPDATE policies enforce auth.uid()=user_id.
GRANT SELECT ON public.profiles,public.cafes TO authenticated;
GRANT UPDATE(display_name,name,bio,age,purpose,allow_dms,is_visible,
 notifications_enabled,phone,date_of_birth,gender,hobbies,motto,
 food_personality,zodiac_sign,weekend_plan,coffee_preference,social_energy)
 ON public.profiles TO authenticated;
-- No INSERT grant: signup's existing server trigger creates the own profile.
COMMIT;
