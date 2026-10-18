-- Append after the migration without its final COMMIT. Synthetic records only. Always ROLLBACK.
DO $test$
DECLARE departing uuid:=gen_random_uuid(); peer uuid:=gen_random_uuid(); venue uuid;
 conv uuid:=gen_random_uuid(); mine uuid:=gen_random_uuid(); theirs uuid:=gen_random_uuid();
 file uuid:=gen_random_uuid(); path text; files jsonb;
BEGIN
 IF has_function_privilege('authenticated','public.prepare_account_deletion(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.get_own_account_deletion()','EXECUTE') THEN RAISE EXCEPTION 'Deletion grants widened'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 VALUES(departing,'authenticated','authenticated',departing||'@example.invalid','{}','{"display_name":"Deletion fixture"}'),
 (peer,'authenticated','authenticated',peer||'@example.invalid','{}','{"display_name":"Peer fixture"}');
 SELECT id INTO venue FROM public.cafes LIMIT 1;
 IF venue IS NULL THEN RAISE EXCEPTION 'Venue required'; END IF;
 INSERT INTO public.conversations(id,user1_id,user2_id,cafe_id) VALUES(conv,departing,peer,venue);
 INSERT INTO public.messages(id,conversation_id,sender_id,content) VALUES(mine,conv,departing,'synthetic own'),(theirs,conv,peer,'synthetic peer');
 INSERT INTO public.waves(from_user_id,to_user_id,cafe_id) VALUES(departing,peer,venue);
 path:=departing::text||'/'||file::text||'.webp';
 INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata) VALUES(file,'avatars',path,departing::text,'{"mimetype":"image/webp","size":1}');
 files:=public.prepare_account_deletion(departing);
 IF jsonb_array_length(files)<>1 THEN RAISE EXCEPTION 'Missing inventory'; END IF;
 IF public.prepare_account_deletion(departing)<>files THEN RAISE EXCEPTION 'Not idempotent'; END IF;
 IF NOT public.is_user_banned(departing) OR EXISTS(SELECT 1 FROM public.profiles WHERE user_id=departing AND is_visible) THEN RAISE EXCEPTION 'Departing profile visible'; END IF;
 BEGIN
  UPDATE public.profiles SET is_visible=true WHERE user_id=departing;
  RAISE EXCEPTION 'Reactivation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',departing::text||'/'||gen_random_uuid()::text||'.webp');
  RAISE EXCEPTION 'Upload after deletion allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM auth.users WHERE id=departing;
  RAISE EXCEPTION 'Auth deleted with remaining files';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Account files must be removed first' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',departing)::text,true);
 IF NOT public.get_own_account_deletion() THEN RAISE EXCEPTION 'Own pending status absent'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',peer)::text,true);
 IF public.get_own_account_deletion() THEN RAISE EXCEPTION 'Peer pending status leaked'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 -- Metadata-only fixture, no real bytes. Move it to the synthetic peer to simulate
 -- an empty departing-user inventory without bypassing Storage's SQL-delete guard.
 -- Real byte removal is separately checked through the handler's Storage API tests.
 UPDATE storage.objects SET name=peer::text||'/'||file::text||'.webp',owner_id=peer::text WHERE id=file;
 IF public.prepare_account_deletion(departing)<>'[]'::jsonb THEN RAISE EXCEPTION 'Inventory not empty'; END IF;
 DELETE FROM auth.users WHERE id=departing;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=departing) OR EXISTS(SELECT 1 FROM public.profiles WHERE user_id=departing)
 OR EXISTS(SELECT 1 FROM public.messages WHERE sender_id=departing) OR EXISTS(SELECT 1 FROM private.account_deletions WHERE user_id=departing)
 OR EXISTS(SELECT 1 FROM public.waves WHERE departing IN(from_user_id,to_user_id)) THEN RAISE EXCEPTION 'Own records remain'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.messages WHERE id=theirs AND content='synthetic peer')
 OR NOT EXISTS(SELECT 1 FROM public.conversations WHERE id=conv AND user1_id IS NULL AND user2_id=peer AND NOT is_active)
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=peer) THEN RAISE EXCEPTION 'Peer records removed'; END IF;
END $test$;
ROLLBACK;
SELECT 'Account deletion: scoped grants, idempotency, write guards, storage-first, own-message removal and peer preservation passed; all synthetic writes rolled back' AS result;
