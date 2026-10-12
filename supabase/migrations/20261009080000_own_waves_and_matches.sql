-- Applied to xbodyzqtltrdtdahrteh after explicit user approval, 9 October 2026. Messages and photos remain closed.
BEGIN;
CREATE OR REPLACE FUNCTION public.send_own_wave(target_user_id uuid,target_cafe_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); server_time timestamptz:=clock_timestamp(); existing_wave public.waves;
 match_id uuid; first_user uuid; second_user uuid;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF target_user_id IS NULL OR target_cafe_id IS NULL OR caller=target_user_id THEN
  RAISE EXCEPTION 'Valid target required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390801));
 PERFORM pg_advisory_xact_lock(hashtextextended(least(caller::text,target_user_id::text)||':'||greatest(caller::text,target_user_id::text),390701));
 IF NOT EXISTS (SELECT 1 FROM public.list_current_cafe_members(target_cafe_id) m WHERE m.user_id=target_user_id)
  OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=caller AND p.allow_dms)
  OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=target_user_id AND p.allow_dms) THEN
  RAISE EXCEPTION 'Target unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO existing_wave FROM public.waves WHERE from_user_id=caller AND to_user_id=target_user_id AND cafe_id=target_cafe_id;
 IF NOT FOUND OR existing_wave.created_at < date_trunc('day',server_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' THEN
  IF (SELECT count(*) FROM public.waves WHERE from_user_id=caller AND created_at>=date_trunc('day',server_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=3 THEN
   RAISE EXCEPTION 'Daily wave limit reached' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.waves(from_user_id,to_user_id,cafe_id,created_at) VALUES(caller,target_user_id,target_cafe_id,server_time)
   ON CONFLICT(from_user_id,to_user_id,cafe_id) DO UPDATE SET created_at=EXCLUDED.created_at;
 END IF;
 IF EXISTS(SELECT 1 FROM public.waves WHERE from_user_id=target_user_id AND to_user_id=caller AND cafe_id=target_cafe_id
   AND created_at>=server_time-interval '24 hours') THEN
  first_user:=least(caller,target_user_id); second_user:=greatest(caller,target_user_id);
  INSERT INTO public.matches(user1_id,user2_id,cafe_id) VALUES(first_user,second_user,target_cafe_id)
   ON CONFLICT(user1_id,user2_id,cafe_id) DO NOTHING;
  SELECT id INTO match_id FROM public.matches WHERE user1_id=first_user AND user2_id=second_user AND cafe_id=target_cafe_id;
 END IF;
 RETURN jsonb_build_object('is_match',match_id IS NOT NULL,'match_id',match_id);
END $$;

CREATE OR REPLACE FUNCTION public.list_own_current_waves()
RETURNS TABLE(id uuid,from_user_id uuid,to_user_id uuid,cafe_id uuid,created_at timestamptz,display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid();
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT w.id,w.from_user_id,w.to_user_id,w.cafe_id,w.created_at,m.display_name
 FROM public.waves w CROSS JOIN LATERAL public.list_current_cafe_members(w.cafe_id) m
 WHERE (w.from_user_id=caller OR w.to_user_id=caller)
  AND m.user_id=CASE WHEN w.from_user_id=caller THEN w.to_user_id ELSE w.from_user_id END
  AND w.created_at>=now()-interval '24 hours' ORDER BY w.created_at DESC,w.id LIMIT 100;
END $$;

CREATE OR REPLACE FUNCTION public.list_own_current_matches()
RETURNS TABLE(id uuid,user1_id uuid,user2_id uuid,cafe_id uuid,conversation_id uuid,created_at timestamptz,display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid();
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT mt.id,mt.user1_id,mt.user2_id,mt.cafe_id,mt.conversation_id,mt.created_at,m.display_name
 FROM public.matches mt CROSS JOIN LATERAL public.list_current_cafe_members(mt.cafe_id) m
 WHERE (mt.user1_id=caller OR mt.user2_id=caller)
  AND m.user_id=CASE WHEN mt.user1_id=caller THEN mt.user2_id ELSE mt.user1_id END
 ORDER BY mt.created_at DESC,mt.id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.send_own_wave(uuid,uuid),public.list_own_current_waves(),public.list_own_current_matches() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.send_own_wave(uuid,uuid),public.list_own_current_waves(),public.list_own_current_matches() TO authenticated;
COMMIT;
