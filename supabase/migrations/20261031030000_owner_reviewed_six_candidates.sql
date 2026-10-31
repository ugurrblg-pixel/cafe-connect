BEGIN;
-- One explicit owner-reviewed batch, not a global relaxation of address checks.
-- Canonical business fields continue to come exclusively from the open record.
DO $batch$
DECLARE c private.place_candidates; x private.candidate_google_checks; g public.cafes;
 candidate uuid; existing private.google_source_adoptions; applied integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(19001001);
 FOR candidate IN SELECT unnest(ARRAY[
  '0a990574-2c8b-4428-a7fa-293feb6e73a9'::uuid,
  '6f2e4985-8114-4125-b907-e91740479d17'::uuid,
  '8a81e0b7-558f-41da-b409-8b5917116071'::uuid,
  'b00c8ad2-f4d5-4ae5-81da-927bf75e8065'::uuid,
  'dd203d9b-d21f-4731-a546-13c36078bde9'::uuid,
  'f33b9e93-1e0d-4639-87a0-7cbcc60a98cb'::uuid
 ]) LOOP
  SELECT * INTO x FROM private.candidate_google_checks WHERE candidate_id=candidate FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing reviewed comparison: %',candidate; END IF;
  SELECT * INTO c FROM private.place_candidates WHERE id=candidate FOR UPDATE;
  IF NOT FOUND OR c.fingerprint IS DISTINCT FROM x.fingerprint
   OR c.provider<>'overture' OR c.record->>'license' NOT IN ('CDLA-Permissive-2.0','CC0-1.0')
   OR c.record->>'status'<>'unknown' THEN RAISE EXCEPTION 'Reviewed evidence changed: %',candidate; END IF;
  PERFORM 1 FROM private.targeted_place_refresh WHERE google_place_id=x.google_place_id FOR UPDATE;
  SELECT * INTO g FROM public.cafes WHERE id=x.cafe_id FOR UPDATE;
  IF NOT FOUND OR g.google_place_id IS DISTINCT FROM x.google_place_id THEN RAISE EXCEPTION 'Reviewed identity changed: %',candidate; END IF;
  SELECT * INTO existing FROM private.google_source_adoptions WHERE candidate_id=candidate;
  IF FOUND THEN
   IF existing.cafe_id<>g.id OR NOT g.independent_approved OR g.data_source<>c.provider THEN RAISE EXCEPTION 'Conflicting previous adoption'; END IF;
   applied:=applied+1; CONTINUE;
  END IF;
  IF x.status<>'different' OR c.status<>'pending' OR g.data_source IS NOT NULL
   OR g.category IS DISTINCT FROM c.record->>'category'
   OR private.source_match_name(g.name) IS DISTINCT FROM private.source_match_name(c.record->>'name')
   OR (c.record->>'latitude')::float8 NOT BETWEEN 40.64 AND 40.85
   OR (c.record->>'longitude')::float8 NOT BETWEEN 29.28 AND 29.47
   OR g.latitude IS NULL OR g.longitude IS NULL
   OR private.place_distance(g.latitude,g.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)>30
   OR EXISTS(SELECT 1 FROM private.place_source_links l WHERE l.provider=c.provider AND l.source_id=c.source_id)
   OR EXISTS(SELECT 1 FROM private.google_source_adoptions a WHERE a.cafe_id=g.id)
  THEN RAISE EXCEPTION 'Reviewed match no longer satisfies owner rule: %',candidate; END IF;
  INSERT INTO private.google_source_adoptions(cafe_id,candidate_id,google_place_id) VALUES(g.id,c.id,g.google_place_id);
  UPDATE public.cafes SET independent_approved=true WHERE id=g.id;
  UPDATE private.targeted_place_refresh SET needs_refresh=false,lease_token=NULL,lease_until=NULL WHERE google_place_id=g.google_place_id;
  UPDATE private.candidate_google_checks SET status='verified_saved',lease=NULL,lease_until=NULL,checked_at=now() WHERE candidate_id=c.id;
  INSERT INTO private.place_directory_audit(candidate_id,reviewer,action,details)
   VALUES(c.id,'owner explicitly approved six candidates, 31 October 2026','source_adoption',
    jsonb_build_object('existing_cafe_id',g.id,'rule','owner_reviewed_same_name_category_30m','address_review','owner_accepted','google_address_verified',false));
  applied:=applied+1;
 END LOOP;
 IF applied<>6 THEN RAISE EXCEPTION 'Expected six reviewed matches'; END IF;
END $batch$;
COMMIT;
