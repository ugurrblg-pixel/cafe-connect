-- Prepared only. Client tables stay closed; no moderator access is granted.
BEGIN;
CREATE OR REPLACE FUNCTION public.submit_own_report(target_user_id uuid,report_reason text,report_description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); saved uuid; details text:=nullif(btrim(report_description),'');
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF target_user_id IS NULL OR target_user_id=caller OR report_reason IS NULL
  OR report_reason NOT IN ('spam','harassment','inappropriate') OR char_length(details)>500 THEN
  RAISE EXCEPTION 'Invalid report' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=caller) OR public.is_user_banned(caller) THEN
  RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,391011));
 -- Previous conversations and own blocks remain reportable after leaving the cafe.
 IF NOT EXISTS(SELECT 1 FROM public.conversations c WHERE
  (c.user1_id=caller AND c.user2_id=target_user_id) OR (c.user2_id=caller AND c.user1_id=target_user_id))
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE b.blocker_id=caller AND b.blocked_id=target_user_id)
 AND NOT EXISTS(SELECT 1 FROM public.check_ins ci
  CROSS JOIN LATERAL public.list_current_cafe_members(ci.cafe_id) member
  WHERE ci.user_id=caller AND ci.expiry_time>now() AND member.user_id=target_user_id) THEN
  RAISE EXCEPTION 'Target unavailable' USING ERRCODE='42501'; END IF;
 -- Retrying an already pending report does not create another record or consume quota.
 SELECT r.id INTO saved FROM public.reports r WHERE r.reporter_id=caller
  AND r.reported_user_id=target_user_id AND r.reason=report_reason AND r.status='pending'
  AND r.created_at>clock_timestamp()-interval '24 hours' ORDER BY r.created_at DESC LIMIT 1;
 IF saved IS NOT NULL THEN RETURN saved; END IF;
 IF (SELECT count(*) FROM public.reports r WHERE r.reporter_id=caller
  AND r.created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=5 THEN
  RAISE EXCEPTION 'Daily report limit reached' USING ERRCODE='54000'; END IF;
 INSERT INTO public.reports(reporter_id,reported_user_id,reason,description)
 VALUES(caller,target_user_id,report_reason,details) RETURNING id INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.submit_own_report(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_own_report(uuid,text,text) TO authenticated;
COMMIT;
