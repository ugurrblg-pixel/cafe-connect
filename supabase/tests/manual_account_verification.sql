-- Execute after the migration body inside the same BEGIN transaction, omitting its COMMIT.
-- Synthetic storage metadata only; every change is rolled back.
DO $test$
DECLARE uid uuid; admin_uid uuid; photo uuid:=gen_random_uuid(); selfie uuid:=gen_random_uuid(); path text; spath text; req uuid; got jsonb;
BEGIN
 SELECT p.user_id INTO uid FROM public.profiles p WHERE NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id) AND NOT public.is_user_banned(p.user_id) LIMIT 1;
 SELECT user_id INTO admin_uid FROM public.user_roles WHERE role IN ('super_admin','moderator') LIMIT 1;
 IF uid IS NULL OR admin_uid IS NULL THEN RAISE EXCEPTION 'Two existing test actors required'; END IF;
 IF has_table_privilege('authenticated','private.account_verifications','SELECT') OR has_function_privilege('anon','public.review_account_verification(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Permissions exposed'; END IF;
 IF (SELECT public FROM storage.buckets WHERE id='verification-selfies') THEN RAISE EXCEPTION 'Selfie bucket public'; END IF;
 path:=uid::text||'/'||photo::text||'.webp'; spath:=uid::text||'/'||selfie::text||'.webp';
 INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata) VALUES(photo,'avatars',path,uid::text,'{"mimetype":"image/webp","size":16}'),(selfie,'verification-selfies',spath,uid::text,'{"mimetype":"image/webp","size":16}');
 PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','service_role')::text,true);
 UPDATE public.profiles SET photo_url='avatar:'||path,photo_urls=ARRAY['avatar:'||path],is_verified=false,verification_status='none' WHERE user_id=uid;
 PERFORM public.record_photo_review(uid,path,photo,'accepted');
 PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
 BEGIN PERFORM public.submit_own_account_verification(spath,false);RAISE EXCEPTION 'Consent bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.submit_own_account_verification(admin_uid::text||'/bad.webp',true);RAISE EXCEPTION 'Ownership bypass';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 req:=public.submit_own_account_verification(spath,true);
 IF public.can_manage_verification_selfie(spath,true) THEN RAISE EXCEPTION 'Pending selfie deletable'; END IF;
 IF public.can_review_verification_evidence('avatars',path) THEN RAISE EXCEPTION 'Normal user reviewer'; END IF;
 BEGIN PERFORM public.review_account_verification(req,'approved');RAISE EXCEPTION 'Normal user approved';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',admin_uid,'role','authenticated')::text,true);
 IF NOT public.can_review_verification_evidence('avatars',path) OR NOT public.can_review_verification_evidence('verification-selfies',spath) THEN RAISE EXCEPTION 'Submitted evidence inaccessible to moderator'; END IF;
 IF public.can_review_verification_evidence('avatars','unrelated/path.webp') THEN RAISE EXCEPTION 'Unrelated photo exposed'; END IF;
 BEGIN PERFORM public.review_account_verification(req,'rejected','');RAISE EXCEPTION 'Missing rejection reason accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM public.review_account_verification(req,'rejected','Test: yüz net değil');
 IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=uid AND is_verified) THEN RAISE EXCEPTION 'Rejection verified profile'; END IF;
 IF public.can_review_verification_evidence('avatars',path) THEN RAISE EXCEPTION 'Closed evidence exposed'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
 req:=public.submit_own_account_verification(spath,true);
 PERFORM set_config('request.jwt.claims',json_build_object('sub',admin_uid,'role','authenticated')::text,true);
 UPDATE storage.objects SET id=gen_random_uuid() WHERE id=selfie;
 BEGIN PERFORM public.review_account_verification(req,'approved');RAISE EXCEPTION 'Stale object approved';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 UPDATE storage.objects SET id=selfie WHERE bucket_id='verification-selfies' AND name=spath;
 PERFORM public.review_account_verification(req,'approved');
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=uid AND is_verified AND verification_status='approved') THEN RAISE EXCEPTION 'Approval failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_audit_log WHERE target_id=req::text AND action='verification_approved') THEN RAISE EXCEPTION 'Audit missing'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
 PERFORM public.save_own_profile_photos(ARRAY[]::text[]);
 IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=uid AND is_verified) THEN RAISE EXCEPTION 'Changed photo kept badge'; END IF;
 PERFORM public.save_own_profile_photos(ARRAY[path]);
 req:=public.submit_own_account_verification(spath,true);
 PERFORM public.withdraw_own_account_verification();
 IF NOT public.can_manage_verification_selfie(spath,true) THEN RAISE EXCEPTION 'Closed selfie cannot be removed'; END IF;
 BEGIN PERFORM public.submit_own_account_verification(spath,true);RAISE EXCEPTION 'Daily quota bypass';EXCEPTION WHEN program_limit_exceeded THEN NULL;END;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','service_role')::text,true);
 DELETE FROM private.account_verifications WHERE user_id=uid;
 UPDATE public.profiles SET is_verified=true,verification_status='approved' WHERE user_id=uid;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
 PERFORM public.save_own_profile_photos(ARRAY[]::text[]);
 IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=uid AND is_verified) THEN RAISE EXCEPTION 'Legacy badge not invalidated'; END IF;
END $test$;
SET LOCAL ROLE authenticated;
DO $client$
BEGIN
 BEGIN
  UPDATE public.profiles SET is_verified=true,verification_status='approved' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'Direct verification escalation succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.list_admin_account_verifications('pending');
  RAISE EXCEPTION 'Normal user read review queue';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $client$;
RESET ROLE;
ROLLBACK;
SELECT 'Verification ownership, consent, role checks, scoped evidence, rejection, stale objects, approval, audit, badge reset, withdrawal and daily quota passed; all writes rolled back' AS result;





