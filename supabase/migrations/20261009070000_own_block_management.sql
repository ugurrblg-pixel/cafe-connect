-- Applied to xbodyzqtltrdtdahrteh after explicit approval, 9 October 2026. No message or photo access.
BEGIN;
CREATE OR REPLACE FUNCTION public.list_own_blocks()
RETURNS TABLE(id uuid,blocked_id uuid,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid := auth.uid();
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT b.id,b.blocked_id,b.created_at FROM public.user_blocks b
  WHERE b.blocker_id=caller ORDER BY b.created_at DESC,b.id;
END $$;

CREATE OR REPLACE FUNCTION public.set_own_block(target_user_id uuid,blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid := auth.uid();
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF target_user_id IS NULL OR target_user_id=caller OR blocked IS NULL THEN
  RAISE EXCEPTION 'Valid target required' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(least(caller::text,target_user_id::text)||':'||greatest(caller::text,target_user_id::text),390701));
 IF NOT blocked THEN
  DELETE FROM public.user_blocks WHERE blocker_id=caller AND blocked_id=target_user_id;
  -- Removing a block never reopens a previously closed conversation.
  RETURN;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id=caller AND blocked_id=target_user_id)
  AND NOT EXISTS (
   SELECT 1 FROM public.check_ins own_ci
    CROSS JOIN LATERAL public.list_current_cafe_members(own_ci.cafe_id) member
    WHERE own_ci.user_id=caller AND own_ci.expiry_time>now() AND member.user_id=target_user_id
  ) AND NOT EXISTS (
   SELECT 1 FROM public.conversations c WHERE
    (c.user1_id=caller AND c.user2_id=target_user_id) OR
    (c.user2_id=caller AND c.user1_id=target_user_id)
  ) THEN
  RAISE EXCEPTION 'Target unavailable' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(caller,target_user_id)
  ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
 UPDATE public.conversations SET is_active=false WHERE
  (user1_id=caller AND user2_id=target_user_id) OR (user2_id=caller AND user1_id=target_user_id);
END $$;
REVOKE ALL ON FUNCTION public.list_own_blocks(),public.set_own_block(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_own_blocks(),public.set_own_block(uuid,boolean) TO authenticated;
-- Table writes remain closed. No profiles, photos or messages are exposed here.
COMMIT;
