BEGIN;
-- Explicit owner review of three displayed name variants. No fuzzy automatic
-- approval is introduced; Google description fields are not retained here.
DO $batch$
DECLARE r record; c private.place_candidates; g public.cafes; a private.google_source_adoptions; applied integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(19001001);
 FOR r IN SELECT * FROM (VALUES
 ('040cb003-55b8-49cd-8297-6087914a22de'::uuid,'885d546a-3a86-48c4-ab99-a3eeb94a682e'::uuid,'72a40112ce735cf51328e2960a355233','ChIJHSUbY3fhyhQRsHpCs-AwjIM','d375b976f0023d5d2346519f7010a16f'),
 ('8212bf1c-8d06-48af-a1e0-789a1fd8f151'::uuid,'a3f841b3-7044-41f5-b009-e17aad62e3f3'::uuid,'1f74b37b1cf279f20c43ba70c8047b60','ChIJSeYFw8PhyhQRbPU5UP8nnYA','254ec3716a8900cc52ee8ed12a451cd8'),
 ('eb908d60-35c7-4b5a-8152-b1212cf08a4e'::uuid,'e9887be7-29fe-444b-9544-499a5da51bc9'::uuid,'f3c4ddac1ba9d8b78ceb7783287058c6','ChIJ_XvZUYggyxQRyxhN_QV6Z4k','cfac380614a8de2e98fefbd31d5b9aec')
 ) AS approved(candidate_id,cafe_id,fingerprint,place_id,name_hash) LOOP
  SELECT * INTO c FROM private.place_candidates WHERE id=r.candidate_id FOR UPDATE;
  IF NOT FOUND OR c.fingerprint IS DISTINCT FROM r.fingerprint OR c.provider<>'overture'
   OR c.record->>'license' IS DISTINCT FROM 'CDLA-Permissive-2.0' OR c.record->>'status' IS DISTINCT FROM 'unknown'
   THEN RAISE EXCEPTION 'Reviewed source changed'; END IF;
  PERFORM 1 FROM private.candidate_google_checks WHERE candidate_id=c.id AND fingerprint=c.fingerprint FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reviewed comparison missing'; END IF;
  PERFORM 1 FROM private.targeted_place_refresh WHERE google_place_id=r.place_id FOR UPDATE;
  SELECT * INTO g FROM public.cafes WHERE id=r.cafe_id FOR UPDATE;
  IF NOT FOUND OR g.google_place_id IS DISTINCT FROM r.place_id THEN RAISE EXCEPTION 'Reviewed identity changed'; END IF;
  SELECT * INTO a FROM private.google_source_adoptions WHERE candidate_id=c.id;
  IF FOUND THEN
   IF a.cafe_id<>g.id OR NOT g.independent_approved OR g.data_source IS DISTINCT FROM c.provider THEN RAISE EXCEPTION 'Conflicting adoption'; END IF;
   applied:=applied+1; CONTINUE;
  END IF;
  IF c.status<>'pending' OR g.data_source IS NOT NULL OR md5(g.name) IS DISTINCT FROM r.name_hash
   OR g.category IS DISTINCT FROM c.record->>'category'
   OR g.last_synced_at IS NULL OR g.last_synced_at<now()-interval '28 days' OR g.last_synced_at>now()+interval '1 minute'
   OR g.latitude IS NULL OR g.longitude IS NULL
   OR (c.record->>'latitude')::float8 NOT BETWEEN 40.64 AND 40.85
   OR (c.record->>'longitude')::float8 NOT BETWEEN 29.28 AND 29.47
   OR private.place_distance(g.latitude,g.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)>30
   OR EXISTS(SELECT 1 FROM private.google_source_adoptions WHERE cafe_id=g.id)
   OR EXISTS(SELECT 1 FROM private.place_source_links WHERE provider=c.provider AND source_id=c.source_id)
   OR EXISTS(SELECT 1 FROM public.cafes other WHERE other.id<>g.id
    AND private.source_match_name(other.name)=private.source_match_name(g.name)
    AND private.place_distance(other.latitude,other.longitude,g.latitude,g.longitude)<=30)
   OR EXISTS(SELECT 1 FROM private.place_candidates other WHERE other.id<>c.id AND other.status='pending'
    AND private.source_match_name(other.record->>'name')=private.source_match_name(c.record->>'name')
    AND private.place_distance((other.record->>'latitude')::float8,(other.record->>'longitude')::float8,g.latitude,g.longitude)<=30)
   THEN RAISE EXCEPTION 'Reviewed variant no longer satisfies owner rule'; END IF;
  INSERT INTO private.google_source_adoptions(cafe_id,candidate_id,google_place_id) VALUES(g.id,c.id,g.google_place_id);
  UPDATE public.cafes SET independent_approved=true WHERE id=g.id;
  UPDATE private.targeted_place_refresh SET needs_refresh=false,lease_token=NULL,lease_until=NULL WHERE google_place_id=g.google_place_id;
  UPDATE private.candidate_google_checks SET cafe_id=g.id,google_place_id=g.google_place_id,status='verified_saved',
   decision_reason='owner_reviewed_name_variant_category_30m',lease=NULL,lease_until=NULL,checked_at=now() WHERE candidate_id=c.id;
  INSERT INTO private.place_directory_audit(candidate_id,reviewer,action,details)
   VALUES(c.id,'owner explicitly approved Play Studio, Puma and Paradise, 1 November 2026','source_adoption',
    jsonb_build_object('existing_cafe_id',g.id,'rule','owner_reviewed_name_variant_category_30m','google_address_verified',false));
  applied:=applied+1;
 END LOOP;
 IF applied<>3 THEN RAISE EXCEPTION 'Expected three reviewed variants'; END IF;
END $batch$;
COMMIT;
