BEGIN;
-- Operational evidence only. Google names, addresses and coordinates are not
-- copied into the independently licensed candidate record or this table.
CREATE TABLE private.candidate_google_checks (
 candidate_id uuid PRIMARY KEY REFERENCES private.place_candidates(id),
 fingerprint text NOT NULL,
 cafe_id uuid REFERENCES public.cafes(id),
 google_place_id text,
 status text NOT NULL CHECK(status IN ('cache_not_exact','ambiguous','ready','checking','api_error','missing_address','different','verified_saved','identity_changed')),
 lease uuid, lease_until timestamptz, checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.candidate_google_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.candidate_google_checks FROM PUBLIC,anon,authenticated;

-- Snapshot the not-yet-adopted pilot pool once. Re-running does not erase evidence.
WITH candidates AS (
 SELECT c.* FROM private.place_candidates c
 WHERE c.status='pending'
 AND (c.record->>'latitude')::float8 BETWEEN 40.64 AND 40.85
 AND (c.record->>'longitude')::float8 BETWEEN 29.28 AND 29.47
 AND NOT EXISTS(SELECT 1 FROM private.google_source_adoptions a WHERE a.candidate_id=c.id)
), matches AS (
 SELECT c.id candidate_id,g.id cafe_id,g.google_place_id,
 count(*) OVER(PARTITION BY c.id) candidate_matches,
 count(*) OVER(PARTITION BY g.id) target_matches
 FROM candidates c JOIN public.cafes g ON g.data_source IS NULL AND g.google_place_id IS NOT NULL
 AND g.last_synced_at BETWEEN now()-interval '28 days' AND now()+interval '1 minute'
 AND g.category=c.record->>'category'
 AND private.source_match_name(g.name)=private.source_match_name(c.record->>'name')
 AND private.place_distance(g.latitude,g.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)<=25
), summary AS (
 SELECT c.id,c.fingerprint,count(m.cafe_id) n,
 min(m.cafe_id::text)::uuid cafe_id,min(m.google_place_id) google_place_id,
 max(m.target_matches) target_matches FROM candidates c LEFT JOIN matches m ON m.candidate_id=c.id GROUP BY c.id,c.fingerprint
)
INSERT INTO private.candidate_google_checks(candidate_id,fingerprint,cafe_id,google_place_id,status)
SELECT id,fingerprint,CASE WHEN n=1 THEN cafe_id END,CASE WHEN n=1 THEN google_place_id END,
 CASE WHEN n=0 THEN 'cache_not_exact' WHEN n<>1 OR target_matches<>1 THEN 'ambiguous' ELSE 'ready' END
FROM summary ON CONFLICT(candidate_id) DO NOTHING;

CREATE FUNCTION public.claim_candidate_google_checks() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE remaining integer; result jsonb; budget_day date:=(now() AT TIME ZONE 'UTC')::date;
BEGIN
 PERFORM pg_advisory_xact_lock(20001001);
 INSERT INTO private.targeted_place_budget(day) VALUES(budget_day) ON CONFLICT DO NOTHING;
 SELECT 20-used INTO remaining FROM private.targeted_place_budget WHERE day=budget_day FOR UPDATE;
 IF remaining<=0 THEN RETURN '[]'; END IF;
 WITH picked AS (
  SELECT candidate_id FROM private.candidate_google_checks WHERE status='ready'
  ORDER BY candidate_id LIMIT least(6,remaining) FOR UPDATE SKIP LOCKED
 ), claimed AS (
  UPDATE private.candidate_google_checks x SET status='checking',lease=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  FROM picked p WHERE x.candidate_id=p.candidate_id RETURNING x.*
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('candidate_id',x.candidate_id,'place_id',x.google_place_id,'lease',x.lease)),'[]')
 INTO result FROM claimed x;
 UPDATE private.targeted_place_budget SET used=used+jsonb_array_length(result) WHERE day=budget_day;
 RETURN result;
END; $$;

CREATE FUNCTION public.finish_candidate_google_check(p_candidate uuid,p_lease uuid,p_google jsonb DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE x private.candidate_google_checks; c private.place_candidates; g public.cafes;
 result text:='different'; lat float8; lng float8; alternatives integer;
BEGIN
 PERFORM pg_advisory_xact_lock(19001001);
 SELECT * INTO x FROM private.candidate_google_checks WHERE candidate_id=p_candidate FOR UPDATE;
 IF NOT FOUND OR x.status<>'checking' OR x.lease IS DISTINCT FROM p_lease OR x.lease_until<now() THEN RETURN 'identity_changed'; END IF;
 SELECT * INTO c FROM private.place_candidates WHERE id=p_candidate FOR UPDATE;
 PERFORM 1 FROM private.targeted_place_refresh WHERE google_place_id=x.google_place_id FOR UPDATE;
 SELECT * INTO g FROM public.cafes WHERE id=x.cafe_id FOR UPDATE;
 IF c.fingerprint IS DISTINCT FROM x.fingerprint OR c.status<>'pending' OR g.google_place_id IS DISTINCT FROM x.google_place_id
 OR g.data_source IS NOT NULL OR c.provider NOT IN ('overture','alltheplaces')
 OR c.record->>'license' NOT IN ('CDLA-Permissive-2.0','CC0-1.0')
 OR c.record->>'status'<>'unknown' THEN result:='identity_changed';
 ELSIF p_google IS NULL THEN result:='api_error';
 ELSIF coalesce(length(btrim(c.record->>'address')),0)=0 OR coalesce(length(btrim(p_google->>'formatted_address')),0)=0 THEN result:='missing_address';
 ELSIF p_google->>'place_id'=x.google_place_id
 AND private.source_match_name(p_google->>'name')=private.source_match_name(c.record->>'name')
 AND private.source_match_name(p_google->>'formatted_address')=private.source_match_name(c.record->>'address')
 AND p_google->>'business_status' IS DISTINCT FROM 'CLOSED_PERMANENTLY'
 AND (p_google->'types') ? (c.record->>'category')
 AND jsonb_typeof(p_google#>'{geometry,location,lat}')='number'
 AND jsonb_typeof(p_google#>'{geometry,location,lng}')='number' THEN
  lat:=(p_google#>>'{geometry,location,lat}')::float8; lng:=(p_google#>>'{geometry,location,lng}')::float8;
  IF lat BETWEEN -85 AND 85 AND lng BETWEEN -180 AND 180
  AND private.place_distance(lat,lng,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)<=25 THEN
   SELECT count(*) INTO alternatives FROM private.place_candidates other
    WHERE other.status='pending' AND other.provider IN ('overture','alltheplaces')
    AND private.source_match_name(other.record->>'name')=private.source_match_name(c.record->>'name')
    AND other.record->>'category'=c.record->>'category'
    AND private.place_distance(lat,lng,(other.record->>'latitude')::float8,(other.record->>'longitude')::float8)<=25;
   IF alternatives=1 AND NOT EXISTS(SELECT 1 FROM public.cafes other WHERE other.id<>g.id
    AND private.source_match_name(other.name)=private.source_match_name(c.record->>'name')
    AND private.place_distance(lat,lng,other.latitude,other.longitude)<=25)
   AND NOT EXISTS(SELECT 1 FROM private.place_source_links l WHERE l.provider=c.provider AND l.source_id=c.source_id)
   AND NOT EXISTS(SELECT 1 FROM private.google_source_adoptions a WHERE a.candidate_id=c.id OR a.cafe_id=g.id) THEN
    INSERT INTO private.google_source_adoptions(cafe_id,candidate_id,google_place_id) VALUES(g.id,c.id,g.google_place_id);
    -- Existing trigger projects ONLY the candidate's independent business fields.
    UPDATE public.cafes SET independent_approved=true WHERE id=g.id;
    UPDATE private.targeted_place_refresh SET needs_refresh=false,lease_token=NULL,lease_until=NULL WHERE google_place_id=g.google_place_id;
    INSERT INTO private.place_directory_audit(candidate_id,reviewer,action,details)
    VALUES(c.id,'owner-authorized Google address comparison','source_adoption',jsonb_build_object('existing_cafe_id',g.id,'rule','exact_name_address_category_25m'));
    result:='verified_saved';
   ELSE result:='ambiguous'; END IF;
  END IF;
 END IF;
 UPDATE private.candidate_google_checks SET status=result,lease=NULL,lease_until=NULL,checked_at=now() WHERE candidate_id=p_candidate;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.claim_candidate_google_checks(),public.finish_candidate_google_check(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_candidate_google_checks(),public.finish_candidate_google_check(uuid,uuid,jsonb) TO service_role;
COMMIT;
