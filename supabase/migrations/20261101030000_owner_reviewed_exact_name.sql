BEGIN;
-- Owner approved the identical-name pair shown on 1 November. This is one
-- reviewed category exception (bar/cafe), not a relaxed automatic match rule.
DO $review$
DECLARE c private.place_candidates; g public.cafes; a private.google_source_adoptions;
BEGIN
 PERFORM pg_advisory_xact_lock(19001001);
 SELECT * INTO c FROM private.place_candidates WHERE id='9a3ac7ff-9980-47e0-b76a-1b6cb6ad6501' FOR UPDATE;
 IF NOT FOUND OR c.fingerprint<>'3b905385344a4fadeca027264f5cec8d'
 OR c.provider<>'overture' OR c.record->>'name' IS DISTINCT FROM 'Cafes Bar Cafe'
 OR c.record->>'category' IS DISTINCT FROM 'cafe'
 OR c.record->>'license' IS DISTINCT FROM 'CDLA-Permissive-2.0'
 OR c.record->>'status' IS DISTINCT FROM 'unknown'
 THEN RAISE EXCEPTION 'Reviewed source changed'; END IF;
 PERFORM 1 FROM private.candidate_google_checks WHERE candidate_id=c.id AND fingerprint=c.fingerprint FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reviewed comparison missing'; END IF;
 PERFORM 1 FROM private.targeted_place_refresh WHERE google_place_id='ChIJd6l-yw8gyxQRkIMaaqio_5A' FOR UPDATE;
 SELECT * INTO g FROM public.cafes WHERE id='d0dd4a8c-fbc5-4580-a48f-05fdea5fbe1f' FOR UPDATE;
 IF NOT FOUND OR g.google_place_id IS DISTINCT FROM 'ChIJd6l-yw8gyxQRkIMaaqio_5A' THEN RAISE EXCEPTION 'Reviewed target changed'; END IF;
 SELECT * INTO a FROM private.google_source_adoptions WHERE candidate_id=c.id;
 IF FOUND THEN
  IF a.cafe_id<>g.id OR NOT g.independent_approved OR g.data_source IS DISTINCT FROM c.provider THEN RAISE EXCEPTION 'Conflicting adoption'; END IF;
  RETURN;
 END IF;
 IF c.status<>'pending' OR g.data_source IS NOT NULL OR g.category IS DISTINCT FROM 'bar'
 OR private.source_match_name(g.name) IS DISTINCT FROM private.source_match_name(c.record->>'name')
 OR g.last_synced_at IS NULL OR g.last_synced_at<now()-interval '28 days'
 OR g.latitude IS NULL OR g.longitude IS NULL
 OR private.place_distance(g.latitude,g.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)>30
 OR EXISTS(SELECT 1 FROM private.google_source_adoptions WHERE cafe_id=g.id)
 OR EXISTS(SELECT 1 FROM private.place_source_links WHERE provider=c.provider AND source_id=c.source_id)
 OR EXISTS(SELECT 1 FROM private.place_candidates other WHERE other.id<>c.id AND other.status='pending'
  AND private.source_match_name(other.record->>'name')=private.source_match_name(c.record->>'name')
  AND private.place_distance((other.record->>'latitude')::float8,(other.record->>'longitude')::float8,g.latitude,g.longitude)<=30)
 OR EXISTS(SELECT 1 FROM public.cafes other WHERE other.id<>g.id
  AND private.source_match_name(other.name)=private.source_match_name(g.name)
  AND private.place_distance(other.latitude,other.longitude,g.latitude,g.longitude)<=30)
 THEN RAISE EXCEPTION 'Reviewed identity, freshness or distance changed'; END IF;
 INSERT INTO private.google_source_adoptions(cafe_id,candidate_id,google_place_id) VALUES(g.id,c.id,g.google_place_id);
 UPDATE public.cafes SET independent_approved=true WHERE id=g.id;
 UPDATE private.targeted_place_refresh SET needs_refresh=false,lease_token=NULL,lease_until=NULL WHERE google_place_id=g.google_place_id;
 UPDATE private.candidate_google_checks SET cafe_id=g.id,google_place_id=g.google_place_id,status='verified_saved',
  decision_reason='owner_reviewed_exact_name_30m_category_exception',lease=NULL,lease_until=NULL,checked_at=now() WHERE candidate_id=c.id;
 INSERT INTO private.place_directory_audit(candidate_id,reviewer,action,details)
 VALUES(c.id,'owner approved identical-name pair, 1 November 2026','source_adoption',
  jsonb_build_object('existing_cafe_id',g.id,'rule','owner_reviewed_exact_name_30m','category_review','bar_to_cafe_accepted','google_address_verified',false));
END $review$;
COMMIT;
