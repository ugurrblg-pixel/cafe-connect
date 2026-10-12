-- Applied to xbodyzqtltrdtdahrteh after explicit approval, 9 October 2026. Photos and messages stay private.
BEGIN;
CREATE OR REPLACE FUNCTION public.list_current_cafe_members(target_cafe_id uuid)
RETURNS TABLE (
  id uuid, user_id uuid, display_name text, age integer, bio text, purpose text,
  allow_dms boolean, is_verified boolean, hobbies text[],
  check_in_time timestamptz, last_active_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF public.is_user_banned(caller) THEN
    RAISE EXCEPTION 'Account restricted' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.check_ins c
    WHERE c.user_id=caller AND c.cafe_id=target_cafe_id AND c.expiry_time>now())
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=caller AND p.is_visible) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id,p.user_id,p.display_name,p.age,p.bio,p.purpose,p.allow_dms,p.is_verified,p.hobbies,
    c.check_in_time,c.last_active_at
  FROM public.profiles p
  JOIN LATERAL (
    SELECT ci.check_in_time,ci.last_active_at FROM public.check_ins ci
    WHERE ci.user_id=p.user_id AND ci.cafe_id=target_cafe_id AND ci.expiry_time>now()
    ORDER BY ci.check_in_time DESC,ci.id LIMIT 1
  ) c ON true
  WHERE p.user_id<>caller AND p.is_visible AND NOT public.is_user_banned(p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
      (b.blocker_id=caller AND b.blocked_id=p.user_id) OR
      (b.blocker_id=p.user_id AND b.blocked_id=caller))
  ORDER BY c.check_in_time DESC,p.id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.list_current_cafe_members(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_current_cafe_members(uuid) TO authenticated;
-- No changes to table grants/RLS or Storage. Exposes only the declared columns.
COMMIT;
