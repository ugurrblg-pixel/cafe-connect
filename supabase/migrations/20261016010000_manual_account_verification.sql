-- Reviewed activation required: exposes only submitted verification evidence to existing moderators.
BEGIN;
CREATE TABLE private.account_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_order bigint GENERATED ALWAYS AS IDENTITY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 selfie_path text NOT NULL, selfie_object_id uuid NOT NULL, photo_path text NOT NULL, photo_object_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
 reason text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), reviewed_at timestamptz, reviewed_by uuid
);
CREATE UNIQUE INDEX one_pending_verification ON private.account_verifications(user_id) WHERE status='pending';
ALTER TABLE private.account_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_verifications FROM PUBLIC,anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('verification-selfies','verification-selfies',false,5242880,ARRAY['image/webp']);

CREATE FUNCTION public.can_manage_verification_selfie(object_name text, removing boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid();
BEGIN
 IF caller IS NULL OR public.is_user_banned(caller) OR object_name !~ ('^'||caller::text||'/[0-9a-f-]{36}\.webp$') THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390516));
 IF removing THEN RETURN NOT EXISTS(SELECT 1 FROM private.account_verifications WHERE user_id=caller AND selfie_path=object_name AND status='pending'); END IF;
 RETURN NOT EXISTS(SELECT 1 FROM private.account_verifications WHERE user_id=caller AND status='pending')
  AND (SELECT count(*)<2 FROM storage.objects WHERE bucket_id='verification-selfies' AND split_part(name,'/',1)=caller::text);
END $$;
CREATE FUNCTION public.can_review_verification_evidence(bucket text, object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(public.get_own_admin_role(),'') IN ('super_admin','moderator') AND EXISTS(
 SELECT 1 FROM private.account_verifications v WHERE v.status='pending' AND v.user_id<>auth.uid()
 AND v.created_at>now()-interval '7 days' AND (
 (bucket='verification-selfies' AND v.selfie_path=object_name AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=bucket AND o.name=object_name AND o.id=v.selfie_object_id)) OR
 (bucket='avatars' AND v.photo_path=object_name AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=bucket AND o.name=object_name AND o.id=v.photo_object_id))))
$$;
CREATE POLICY own_verification_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='verification-selfies' AND split_part(name,'/',1)=auth.uid()::text);
CREATE POLICY own_verification_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='verification-selfies' AND public.can_manage_verification_selfie(name));
CREATE POLICY own_verification_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='verification-selfies' AND public.can_manage_verification_selfie(name,true));
CREATE POLICY submitted_verification_evidence ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id IN ('avatars','verification-selfies') AND public.can_review_verification_evidence(bucket_id,name));

CREATE FUNCTION public.get_own_account_verification()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_build_object('id',id,'status',status,'reason',reason,'created_at',created_at)
 FROM private.account_verifications WHERE user_id=auth.uid() ORDER BY request_order DESC LIMIT 1);
END $$;

-- Only a trusted RPC with a matching private request may change verification fields.
CREATE OR REPLACE FUNCTION public.protect_profile_managed_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF auth.role() IN ('anon','authenticated') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.is_verified OR NEW.verification_status<>'none' OR NEW.photo_moderation_status<>'pending' OR NEW.boosted_until IS NOT NULL THEN
    RAISE EXCEPTION 'Managed profile fields require server authorization' USING ERRCODE='42501'; END IF;
  ELSE
   IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
    OR (NEW.photo_moderation_status IS DISTINCT FROM OLD.photo_moderation_status AND NOT(current_user NOT IN ('anon','authenticated') AND NEW.photo_moderation_status='pending')) THEN
    RAISE EXCEPTION 'Managed profile fields require server authorization' USING ERRCODE='42501'; END IF;
   IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF current_user IN ('anon','authenticated') OR (NOT EXISTS(SELECT 1 FROM private.account_verifications v WHERE v.user_id=NEW.user_id
      AND (CASE WHEN v.status='withdrawn' THEN 'none' ELSE v.status END)=NEW.verification_status
      AND NEW.is_verified=(v.status='approved') AND v.id=(SELECT id FROM private.account_verifications WHERE user_id=NEW.user_id ORDER BY request_order DESC LIMIT 1)) AND NOT (OLD.is_verified AND NEW.photo_url IS DISTINCT FROM OLD.photo_url AND NEW.verification_status='none' AND NOT NEW.is_verified)) THEN
     RAISE EXCEPTION 'Use verification workflow' USING ERRCODE='42501'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.submit_own_account_verification(selfie_object_path text, consent boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); p public.profiles%ROWTYPE; selfie_id uuid; photo_id uuid; path text; result uuid;
BEGIN
 IF caller IS NULL OR public.is_user_banned(caller) OR consent IS DISTINCT FROM true THEN RAISE EXCEPTION 'Consent and sign in required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390516));
 SELECT * INTO p FROM public.profiles WHERE user_id=caller FOR UPDATE;
 IF NOT FOUND OR p.is_verified OR p.verification_status='approved' THEN RAISE EXCEPTION 'Profile unavailable or already verified' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM private.account_verifications WHERE user_id=caller AND status='pending') THEN RAISE EXCEPTION 'Request already pending' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM private.account_verifications WHERE user_id=caller AND created_at>now()-interval '1 day')>=3 THEN RAISE EXCEPTION 'Daily request limit reached' USING ERRCODE='54000'; END IF;
 IF selfie_object_path IS NULL OR selfie_object_path !~ ('^'||caller::text||'/[0-9a-f-]{36}\.webp$') THEN RAISE EXCEPTION 'Invalid selfie' USING ERRCODE='42501'; END IF;
 SELECT id INTO selfie_id FROM storage.objects WHERE bucket_id='verification-selfies' AND name=selfie_object_path;
 path:=substr(p.photo_url,8);
 SELECT id INTO photo_id FROM storage.objects WHERE bucket_id='avatars' AND name=path AND split_part(name,'/',1)=caller::text;
 IF selfie_id IS NULL OR p.photo_url NOT LIKE 'avatar:%' OR photo_id IS NULL OR NOT EXISTS(SELECT 1 FROM private.photo_reviews WHERE object_path=path AND object_id=photo_id AND user_id=caller AND verdict='accepted') THEN
  RAISE EXCEPTION 'Upload a reviewed main profile photo first' USING ERRCODE='22023'; END IF;
 INSERT INTO private.account_verifications(user_id,selfie_path,selfie_object_id,photo_path,photo_object_id)
 VALUES(caller,selfie_object_path,selfie_id,path,photo_id) RETURNING id INTO result;
 UPDATE public.profiles SET verification_status='pending',is_verified=false,verification_requested_at=now(),verification_selfie_url=NULL WHERE user_id=caller;
 RETURN result;
END $$;
CREATE FUNCTION public.withdraw_own_account_verification()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,390516));
 UPDATE private.account_verifications SET status='withdrawn',reviewed_at=now() WHERE user_id=auth.uid() AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending request' USING ERRCODE='22023'; END IF;
 UPDATE public.profiles SET verification_status='none',is_verified=false WHERE user_id=auth.uid();
END $$;
CREATE FUNCTION public.list_admin_account_verifications(status_filter text DEFAULT 'pending')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF coalesce(public.get_own_admin_role(),'') NOT IN ('super_admin','moderator') THEN RAISE EXCEPTION 'Moderator required' USING ERRCODE='42501'; END IF;
 IF status_filter IS NULL OR status_filter NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid filter' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC,q.id) FROM(
 SELECT v.id,v.user_id,coalesce(nullif(p.display_name,''),nullif(p.name,''),'Kullanıcı') AS display_name,v.status,v.reason,v.created_at,
 CASE WHEN v.status='pending' AND v.created_at>now()-interval '7 days' THEN v.selfie_path END AS selfie_path,
 CASE WHEN v.status='pending' AND v.created_at>now()-interval '7 days' THEN v.photo_path END AS photo_path
 FROM private.account_verifications v JOIN public.profiles p ON p.user_id=v.user_id
 WHERE v.status=status_filter AND v.user_id<>auth.uid() ORDER BY v.created_at DESC,v.id LIMIT 100)q),'[]'::jsonb);
END $$;
CREATE FUNCTION public.review_account_verification(request_id uuid, decision text, rejection_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v private.account_verifications%ROWTYPE; p public.profiles%ROWTYPE; caller uuid:=auth.uid();
BEGIN
 IF coalesce(public.get_own_admin_role(),'') NOT IN ('super_admin','moderator') THEN RAISE EXCEPTION 'Moderator required' USING ERRCODE='42501'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR (decision='rejected' AND (length(trim(coalesce(rejection_reason,'')))<5 OR length(rejection_reason)>300)) THEN RAISE EXCEPTION 'Choose decision and rejection reason' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM private.account_verifications WHERE id=request_id;
 IF NOT FOUND OR v.user_id=caller THEN RAISE EXCEPTION 'Request unavailable' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v.user_id::text,390516));
 SELECT * INTO v FROM private.account_verifications WHERE id=request_id FOR UPDATE;
 SELECT * INTO p FROM public.profiles WHERE user_id=v.user_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'pending' THEN RAISE EXCEPTION 'Request no longer pending' USING ERRCODE='22023'; END IF;
 IF decision='approved' AND (v.created_at<=now()-interval '7 days' OR p.photo_url IS DISTINCT FROM 'avatar:'||v.photo_path
 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE id=v.photo_object_id AND name=v.photo_path AND bucket_id='avatars')
 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE id=v.selfie_object_id AND name=v.selfie_path AND bucket_id='verification-selfies')) THEN
 RAISE EXCEPTION 'Evidence expired or changed; request a new application' USING ERRCODE='22023'; END IF;
 UPDATE private.account_verifications SET status=decision,reason=CASE WHEN decision='rejected' THEN trim(rejection_reason) END,reviewed_at=now(),reviewed_by=caller WHERE id=request_id;
 UPDATE public.profiles SET verification_status=decision,is_verified=(decision='approved') WHERE user_id=v.user_id;
 INSERT INTO public.admin_audit_log(admin_id,action,target_type,target_id,details)
 VALUES(caller,'verification_'||decision,'verification',request_id::text,jsonb_build_object('user_id',v.user_id,'reason',CASE WHEN decision='rejected' THEN trim(rejection_reason) END));
END $$;
REVOKE ALL ON FUNCTION public.can_manage_verification_selfie(text,boolean),public.can_review_verification_evidence(text,text),public.get_own_account_verification(),public.submit_own_account_verification(text,boolean),public.withdraw_own_account_verification(),public.list_admin_account_verifications(text),public.review_account_verification(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_verification_selfie(text,boolean),public.can_review_verification_evidence(text,text),public.get_own_account_verification(),public.submit_own_account_verification(text,boolean),public.withdraw_own_account_verification(),public.list_admin_account_verifications(text),public.review_account_verification(uuid,text,text) TO authenticated;
-- A verified snapshot must not confer a badge on a replacement main photo.
CREATE FUNCTION public.invalidate_changed_verified_photo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.is_verified AND NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
  UPDATE private.account_verifications SET status='withdrawn',reason='Ana profil fotoğrafı değişti',reviewed_at=now()
  WHERE user_id=OLD.user_id AND status='approved';
  NEW.is_verified:=false; NEW.verification_status:='none';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_changed_verified_photo() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER account_verification_photo_changed BEFORE UPDATE OF photo_url ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.invalidate_changed_verified_photo();
COMMIT;


