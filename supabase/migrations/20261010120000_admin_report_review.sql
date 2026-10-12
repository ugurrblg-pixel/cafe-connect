-- Prepared only: no account receives a role in this migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_own_admin_role()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); result text;
BEGIN
 IF caller IS NULL OR public.is_user_banned(caller) THEN RETURN NULL; END IF;
 SELECT r.role::text INTO result FROM public.user_roles r WHERE r.user_id=caller
 ORDER BY CASE r.role WHEN 'super_admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END LIMIT 1;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.list_admin_reports(report_filter text DEFAULT 'pending')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF coalesce(public.get_own_admin_role(),'') NOT IN ('super_admin','moderator') THEN
  RAISE EXCEPTION 'Moderator required' USING ERRCODE='42501'; END IF;
 IF report_filter IS NULL OR report_filter NOT IN ('pending','reviewed','all') THEN
  RAISE EXCEPTION 'Invalid filter' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC,q.id) FROM (
  SELECT r.id,r.reporter_id,r.reported_user_id,r.reason,r.description,r.status,r.created_at,
   coalesce(nullif(p.display_name,''),nullif(p.name,''),'Kullanıcı') AS reporter_name,
   coalesce(nullif(t.display_name,''),nullif(t.name,''),'Kullanıcı') AS reported_name
  FROM public.reports r LEFT JOIN public.profiles p ON p.user_id=r.reporter_id
  LEFT JOIN public.profiles t ON t.user_id=r.reported_user_id
  WHERE report_filter='all' OR (report_filter='pending' AND r.status='pending')
   OR (report_filter='reviewed' AND r.status<>'pending')
  ORDER BY r.created_at DESC,r.id LIMIT 100
 ) q),'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.review_admin_report(target_report_id uuid,new_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text; caller uuid:=auth.uid();
BEGIN
 IF coalesce(public.get_own_admin_role(),'') NOT IN ('super_admin','moderator') THEN
  RAISE EXCEPTION 'Moderator required' USING ERRCODE='42501'; END IF;
 IF new_status IS NULL OR new_status NOT IN ('reviewed','dismissed') THEN
  RAISE EXCEPTION 'Invalid review status' USING ERRCODE='22023'; END IF;
 SELECT r.status INTO previous FROM public.reports r WHERE r.id=target_report_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report unavailable' USING ERRCODE='22023'; END IF;
 IF previous=new_status THEN RETURN; END IF;
 IF previous<>'pending' THEN RAISE EXCEPTION 'Report already reviewed' USING ERRCODE='22023'; END IF;
 UPDATE public.reports SET status=new_status,reviewed_by=caller,reviewed_at=clock_timestamp()
 WHERE id=target_report_id;
 INSERT INTO public.admin_audit_log(admin_id,action,target_type,target_id,details)
 VALUES(caller,'review_report','report',target_report_id::text,jsonb_build_object('from',previous,'to',new_status));
END $$;
REVOKE ALL ON FUNCTION public.get_own_admin_role(),public.list_admin_reports(text),public.review_admin_report(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_admin_role(),public.list_admin_reports(text),public.review_admin_report(uuid,text) TO authenticated;
COMMIT;
