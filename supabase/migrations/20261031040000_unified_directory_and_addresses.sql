BEGIN;
ALTER TABLE private.candidate_google_checks ADD COLUMN decision_reason text;
UPDATE private.candidate_google_checks SET decision_reason=CASE WHEN status='verified_saved' THEN 'previously_reviewed_acceptance' ELSE 'legacy_reason_not_recorded' END;
CREATE FUNCTION private.normalize_candidate_address(v text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $norm$
 SELECT btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
 private.source_match_name(v),'\m(cd|cad|caddesi)\M','cadde','g'),
 '\m(sk|sok|sokagi)\M','sokak','g'),'\m(blv|bulvari)\M','bulvar','g'),
 '\m(mah|mh|mahallesi)\M','mahalle','g'),'\m(numara|no)\M','no','g'));
$norm$;
CREATE FUNCTION private.compare_candidate_address(p_source text,p_google jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $address$
DECLARE a text:=private.normalize_candidate_address(p_source); b text:=private.normalize_candidate_address(p_google->>'formatted_address'); route text; number text; source_number text;
BEGIN
 IF coalesce(a,'')='' OR coalesce(b,'')='' THEN RETURN 'missing_address'; END IF;
 IF jsonb_typeof(p_google->'address_components')='array' THEN
  IF (SELECT count(*) FROM jsonb_array_elements(p_google->'address_components') e WHERE e->'types' ? 'route')<>1
  OR (SELECT count(*) FROM jsonb_array_elements(p_google->'address_components') e WHERE e->'types' ? 'street_number')<>1 THEN RETURN 'incomplete_google_address_components'; END IF;
  SELECT private.normalize_candidate_address(e->>'long_name') INTO route FROM jsonb_array_elements(p_google->'address_components') e WHERE e->'types' ? 'route';
  SELECT private.source_match_name(e->>'long_name') INTO number FROM jsonb_array_elements(p_google->'address_components') e WHERE e->'types' ? 'street_number';
  IF coalesce(route,'')='' OR position(' '||route||' ' in ' '||a||' ')=0 THEN RETURN 'street_differs_or_incomplete'; END IF;
  -- Parse an explicit source building number. Do not mistake a numeric street
  -- (3006. Sokak) or postal code for the building number; preserve suffix/unit.
  source_number:=substring(lower(translate(p_source,'İı','Ii')) from '(?:\mno[.: ]*|\mnumara[.: ]*)([0-9]+[a-z]?(?:[ ]*/[ ]*[a-z0-9]+)?)');
  IF source_number IS NULL THEN RETURN 'source_building_number_missing'; END IF;
  IF coalesce(number,'')='' OR private.source_match_name(source_number)<>number THEN RETURN 'building_number_differs'; END IF;
  RETURN 'matched';
 END IF;
 IF a=b AND a ~ '[0-9]' THEN RETURN 'matched'; END IF;
 RETURN 'unstructured_address_requires_review';
END; $address$;
REVOKE ALL ON FUNCTION private.normalize_candidate_address(text),private.compare_candidate_address(text,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.finish_candidate_google_check(p_candidate uuid,p_lease uuid,p_google jsonb DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE x private.candidate_google_checks; c private.place_candidates; g public.cafes;
 result text:='different'; reason text:='name_category_status_or_coordinates_differ'; lat float8; lng float8; alternatives integer;
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
 ELSIF p_google->>'place_id' IS DISTINCT FROM x.google_place_id THEN reason:='google_identity_differs';
 ELSIF private.source_match_name(p_google->>'name') IS DISTINCT FROM private.source_match_name(c.record->>'name') THEN reason:='name_differs';
 ELSIF NOT coalesce((p_google->'types') ? (c.record->>'category'),false) THEN reason:='category_differs';
 ELSIF p_google->>'business_status'='CLOSED_PERMANENTLY' THEN reason:='google_permanently_closed';
 ELSIF private.compare_candidate_address(c.record->>'address',p_google)<>'matched' THEN reason:=private.compare_candidate_address(c.record->>'address',p_google);
 ELSIF p_google->>'place_id'=x.google_place_id
 AND private.source_match_name(p_google->>'name')=private.source_match_name(c.record->>'name')
 AND p_google->>'business_status' IS DISTINCT FROM 'CLOSED_PERMANENTLY'
 AND (p_google->'types') ? (c.record->>'category')
 AND jsonb_typeof(p_google#>'{geometry,location,lat}')='number'
 AND jsonb_typeof(p_google#>'{geometry,location,lng}')='number' THEN
  lat:=(p_google#>>'{geometry,location,lat}')::float8; lng:=(p_google#>>'{geometry,location,lng}')::float8;
  IF lat BETWEEN -85 AND 85 AND lng BETWEEN -180 AND 180
  AND private.place_distance(lat,lng,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)<=30 THEN
   SELECT count(*) INTO alternatives FROM private.place_candidates other
    WHERE other.status='pending' AND other.provider IN ('overture','alltheplaces')
    AND private.source_match_name(other.record->>'name')=private.source_match_name(c.record->>'name')
    AND other.record->>'category'=c.record->>'category'
    AND private.place_distance(lat,lng,(other.record->>'latitude')::float8,(other.record->>'longitude')::float8)<=30;
   IF alternatives=1 AND NOT EXISTS(SELECT 1 FROM public.cafes other WHERE other.id<>g.id
    AND private.source_match_name(other.name)=private.source_match_name(c.record->>'name')
    AND private.place_distance(lat,lng,other.latitude,other.longitude)<=30)
   AND NOT EXISTS(SELECT 1 FROM private.place_source_links l WHERE l.provider=c.provider AND l.source_id=c.source_id)
   AND NOT EXISTS(SELECT 1 FROM private.google_source_adoptions a WHERE a.candidate_id=c.id OR a.cafe_id=g.id) THEN
    INSERT INTO private.google_source_adoptions(cafe_id,candidate_id,google_place_id) VALUES(g.id,c.id,g.google_place_id);
    -- Existing trigger projects ONLY the candidate's independent business fields.
    UPDATE public.cafes SET independent_approved=true WHERE id=g.id;
    UPDATE private.targeted_place_refresh SET needs_refresh=false,lease_token=NULL,lease_until=NULL WHERE google_place_id=g.google_place_id;
    INSERT INTO private.place_directory_audit(candidate_id,reviewer,action,details)
    VALUES(c.id,'owner-authorized Google address comparison','source_adoption',jsonb_build_object('existing_cafe_id',g.id,'rule','structured_address_name_category_30m'));
    result:='verified_saved'; reason:='structured_address_name_category_30m';
   ELSE result:='ambiguous'; reason:='multiple_source_or_venue_identities'; END IF;
  ELSE reason:='distance_exceeds_30m_or_invalid_coordinates'; END IF;
 END IF;
 IF result IN ('api_error','missing_address','identity_changed') THEN reason:=result; END IF;
 UPDATE private.candidate_google_checks SET decision_reason=reason,status=result,lease=NULL,lease_until=NULL,checked_at=now() WHERE candidate_id=p_candidate;
 RETURN result;
END; $$;

-- Both publication paths retain cafe identity, provenance and independent data.
-- Pending/unadopted candidates, suppressed places and stale Google cache are
-- never made visible by this service-only lookup.
CREATE OR REPLACE FUNCTION public.search_independent_places(p_lat double precision,p_lng double precision,p_radius integer DEFAULT 1500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $search$
DECLARE result jsonb; delta_lng double precision;
BEGIN
 IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -85 AND 85 OR p_lng NOT BETWEEN -180 AND 180
 OR p_radius IS NULL OR p_radius NOT BETWEEN 100 AND 5000 THEN RAISE EXCEPTION 'Invalid search bounds'; END IF;
 delta_lng:=p_radius/(111000*cos(radians(p_lat)));
 WITH evidence AS (
  SELECT d.cafe_id,c.record,c.provider,0 priority FROM private.place_directory d
   JOIN private.place_candidates c ON c.id=d.canonical_record WHERE d.state='active' AND c.status='approved'
  UNION ALL
  SELECT a.cafe_id,c.record,c.provider,1 priority FROM private.google_source_adoptions a
   JOIN private.place_candidates c ON c.id=a.candidate_id
   WHERE c.record->>'status' IN ('open','unknown') AND c.provider IN ('overture','alltheplaces','foursquare_os')
 ), canonical AS (
  SELECT DISTINCT ON (e.cafe_id) e.cafe_id,e.record,e.provider
  FROM evidence e JOIN public.cafes v ON v.id=e.cafe_id
  WHERE v.independent_approved AND v.data_source=e.provider
  ORDER BY e.cafe_id,e.priority
 ), located AS (
  SELECT cafe_id,record,provider,(record->>'latitude')::float8 lat,(record->>'longitude')::float8 lng
  FROM canonical
 ), nearby AS (
  SELECT *,private.place_distance(p_lat,p_lng,lat,lng) distance FROM located
  WHERE lat BETWEEN p_lat-p_radius/111000.0 AND p_lat+p_radius/111000.0
   AND lng BETWEEN p_lng-delta_lng AND p_lng+delta_lng
   AND private.place_distance(p_lat,p_lng,lat,lng)<=p_radius
  ORDER BY distance,cafe_id LIMIT 200
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',cafe_id,'name',record->>'name','address',record->>'address',
  'latitude',lat,'longitude',lng,'category',record->>'category','is_open',NULL,'opening_hours',NULL,
  'image_url','','google_place_id',NULL,'data_source',provider,'attribution',record->>'attribution','license',record->>'license')
  ORDER BY distance,cafe_id),'[]') INTO result FROM nearby;
 RETURN result;
END; $search$;
REVOKE ALL ON FUNCTION public.search_independent_places(double precision,double precision,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_independent_places(double precision,double precision,integer) TO service_role;

COMMIT;
