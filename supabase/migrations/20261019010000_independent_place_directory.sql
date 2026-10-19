BEGIN;
CREATE SCHEMA IF NOT EXISTS private;

-- Separate provenance: a Google cache row is never relabelled as independently owned data.
CREATE TABLE private.place_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('overture','foursquare_os','alltheplaces')),
  source_id text NOT NULL CHECK (length(source_id) BETWEEN 1 AND 300),
  release text NOT NULL CHECK (length(release) BETWEEN 1 AND 100),
  fingerprint text NOT NULL,
  record jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,source_id,release,fingerprint)
);
CREATE TABLE private.place_directory (
  cafe_id uuid PRIMARY KEY REFERENCES public.cafes(id) ON DELETE RESTRICT,
  canonical_record uuid NOT NULL REFERENCES private.place_candidates(id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','closed','suppressed')),
  version integer NOT NULL DEFAULT 1,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX place_directory_lat_lng ON private.place_directory(latitude,longitude) WHERE state='active';
CREATE TABLE private.place_source_links (
  provider text NOT NULL,
  source_id text NOT NULL,
  cafe_id uuid NOT NULL REFERENCES private.place_directory(cafe_id),
  candidate_id uuid NOT NULL REFERENCES private.place_candidates(id),
  PRIMARY KEY(provider,source_id)
);
CREATE TABLE private.place_directory_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cafe_id uuid REFERENCES private.place_directory(cafe_id),
  candidate_id uuid REFERENCES private.place_candidates(id),
  reviewer text NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.place_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.place_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.place_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.place_directory_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.place_candidates,private.place_directory,private.place_source_links,private.place_directory_audit FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.place_distance(lat1 double precision,lng1 double precision,lat2 double precision,lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $$
  SELECT 12742000 * asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)))));
$$;

CREATE FUNCTION public.stage_independent_place(p_record jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE candidate private.place_candidates; v_provider text := p_record->>'provider'; v_license text := p_record->>'license';
  lat double precision; lng double precision; normalized text;
BEGIN
  IF jsonb_typeof(p_record)<>'object' OR v_provider IS NULL OR v_provider NOT IN ('overture','foursquare_os','alltheplaces')
    OR v_license IS NULL OR NOT (
      (v_provider='overture' AND v_license IN ('CC0-1.0','CDLA-Permissive-2.0','Apache-2.0')) OR
      (v_provider='foursquare_os' AND v_license='Apache-2.0') OR (v_provider='alltheplaces' AND v_license='CC0-1.0')) THEN
    RAISE EXCEPTION 'Unsupported independent source/license';
  END IF;
  -- Reject unexpected fields, including scraped photos, reviews and contact details.
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_record) k WHERE k NOT IN
    ('provider','sourceId','release','license','attribution','name','latitude','longitude','category','address','country','status')) THEN
    RAISE EXCEPTION 'Unsupported record field';
  END IF;
  IF coalesce(length(btrim(p_record->>'sourceId')),0) NOT BETWEEN 1 AND 300
    OR coalesce(length(btrim(p_record->>'release')),0) NOT BETWEEN 1 AND 100
    OR coalesce(length(btrim(p_record->>'attribution')),0) NOT BETWEEN 1 AND 1000
    OR coalesce(length(btrim(p_record->>'name')),0) NOT BETWEEN 1 AND 200
    OR coalesce(length(p_record->>'address'),501)>500
    OR coalesce(p_record->>'category','') NOT IN ('cafe','bar','night_club','gym')
    OR coalesce(p_record->>'status','') NOT IN ('open','closed','unknown')
    OR coalesce(p_record->>'country','')<>'TR'
    OR jsonb_typeof(p_record->'latitude') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_record->'longitude') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid place record'; END IF;
  lat := (p_record->>'latitude')::double precision; lng := (p_record->>'longitude')::double precision;
  IF lat NOT BETWEEN 35 AND 43 OR lng NOT BETWEEN 25 AND 45 THEN RAISE EXCEPTION 'Outside launch region'; END IF;
  normalized := lower(translate(p_record->>'name','ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu'));
  normalized := regexp_replace(normalized,'[^a-z0-9]+',' ','g');
  IF normalized ~ '\m(cay[ ]*(evi|evleri|ocagi|ocaklari|bahcesi)|kirathane|kiraathane|kahvehane)(si|leri)?\M'
    OR normalized ~ '\m(kokorec[a-z]*|izgara[a-z]*)\M' THEN RAISE EXCEPTION 'Excluded venue'; END IF;
  INSERT INTO private.place_candidates(provider,source_id,release,fingerprint,record)
  VALUES(v_provider,p_record->>'sourceId',p_record->>'release',md5(p_record::text),p_record)
  ON CONFLICT(provider,source_id,release,fingerprint) DO UPDATE SET record=excluded.record
  RETURNING * INTO candidate;
  RETURN jsonb_build_object('id',candidate.id,'fingerprint',candidate.fingerprint,'status',candidate.status);
END; $$;

-- Only a trusted operator may publish. The planner's similarity score grants no write permission.
CREATE FUNCTION public.publish_independent_place(
  p_candidate uuid,p_fingerprint text,p_reviewer text,p_target uuid DEFAULT NULL,
  p_expected_version integer DEFAULT NULL,p_replace_canonical boolean DEFAULT false,p_accept_material_change boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c private.place_candidates; d private.place_directory; linked uuid; target uuid; r jsonb; material boolean;
BEGIN
  IF coalesce(length(btrim(p_reviewer)),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Reviewer required'; END IF;
  -- Serialize all imports; tiny reviewed batches, not per-user location requests.
  PERFORM pg_advisory_xact_lock(19001001);
  SELECT * INTO c FROM private.place_candidates WHERE id=p_candidate FOR UPDATE;
  IF NOT FOUND OR c.fingerprint IS DISTINCT FROM p_fingerprint OR c.status='rejected' THEN RAISE EXCEPTION 'Candidate changed or unavailable'; END IF;
  r := c.record;
  IF r->>'status'='closed' THEN RAISE EXCEPTION 'Use explicit directory state review for closures'; END IF;
  SELECT cafe_id INTO linked FROM private.place_source_links WHERE provider=c.provider AND source_id=c.source_id;
  IF c.status='approved' THEN
    IF linked IS NULL OR (p_target IS NOT NULL AND p_target<>linked) THEN RAISE EXCEPTION 'Conflicting approved identity'; END IF;
    RETURN linked;
  END IF;
  IF linked IS NOT NULL AND p_target IS DISTINCT FROM linked THEN RAISE EXCEPTION 'Stable source identity already linked'; END IF;
  IF p_target IS NULL THEN
    -- A second independent source within 120m must be reviewed against the existing directory.
    IF EXISTS(SELECT 1 FROM private.place_directory x WHERE private.place_distance(x.latitude,x.longitude,(r->>'latitude')::float8,(r->>'longitude')::float8)<=120) THEN
      IF NOT p_accept_material_change THEN RAISE EXCEPTION 'Nearby directory entry requires explicit separate-venue review'; END IF;
    END IF;
    INSERT INTO public.cafes(name,address,latitude,longitude,category,is_open,rating,image_url)
    VALUES(r->>'name',r->>'address',(r->>'latitude')::float8,(r->>'longitude')::float8,r->>'category',NULL,NULL,'') RETURNING id INTO target;
    INSERT INTO private.place_directory(cafe_id,canonical_record,latitude,longitude)
    VALUES(target,c.id,(r->>'latitude')::float8,(r->>'longitude')::float8);
  ELSE
    SELECT * INTO d FROM private.place_directory WHERE cafe_id=p_target FOR UPDATE;
    IF NOT FOUND OR d.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Directory changed; refresh review'; END IF;
    target := d.cafe_id;
    IF p_replace_canonical THEN
      SELECT ((old.record->>'name') IS DISTINCT FROM (r->>'name') OR (old.record->>'category') IS DISTINCT FROM (r->>'category')
        OR private.place_distance(d.latitude,d.longitude,(r->>'latitude')::float8,(r->>'longitude')::float8)>100)
      INTO material FROM private.place_candidates old WHERE old.id=d.canonical_record;
      IF material AND NOT p_accept_material_change THEN RAISE EXCEPTION 'Material change requires explicit review'; END IF;
      UPDATE private.place_directory SET canonical_record=c.id,latitude=(r->>'latitude')::float8,longitude=(r->>'longitude')::float8,
        version=version+1,reviewed_at=now() WHERE cafe_id=target;
      UPDATE public.cafes SET name=r->>'name',address=r->>'address',latitude=(r->>'latitude')::float8,
        longitude=(r->>'longitude')::float8,category=r->>'category',is_open=NULL,rating=NULL WHERE id=target;
    ELSE
      UPDATE private.place_directory SET version=version+1,reviewed_at=now() WHERE cafe_id=target;
    END IF;
  END IF;
  INSERT INTO private.place_source_links(provider,source_id,cafe_id,candidate_id) VALUES(c.provider,c.source_id,target,c.id)
    ON CONFLICT(provider,source_id) DO UPDATE SET candidate_id=excluded.candidate_id;
  UPDATE private.place_candidates SET status='approved' WHERE id=c.id;
  INSERT INTO private.place_directory_audit(cafe_id,candidate_id,reviewer,action,details)
    VALUES(target,c.id,p_reviewer,'publish',jsonb_build_object('replace',p_replace_canonical,'material_review',p_accept_material_change,'previous_version',d.version));
  RETURN target;
END; $$;

CREATE FUNCTION public.set_independent_place_state(p_cafe uuid,p_expected_version integer,p_state text,p_reviewer text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_state IS NULL OR p_state NOT IN ('active','closed','suppressed') OR coalesce(length(btrim(p_reviewer)),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid review'; END IF;
  UPDATE private.place_directory SET state=p_state,version=version+1,reviewed_at=now() WHERE cafe_id=p_cafe AND version=p_expected_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'Directory changed; refresh review'; END IF;
  INSERT INTO private.place_directory_audit(cafe_id,reviewer,action,details) VALUES(p_cafe,p_reviewer,'state',jsonb_build_object('state',p_state,'previous_version',p_expected_version));
  RETURN true;
END; $$;

-- Service-only lookup; the edge function authenticates the caller before invoking it.
CREATE FUNCTION public.search_independent_places(p_lat double precision,p_lng double precision,p_radius integer DEFAULT 1500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; delta_lng double precision;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -85 AND 85 OR p_lng NOT BETWEEN -180 AND 180
    OR p_radius IS NULL OR p_radius NOT BETWEEN 100 AND 5000 THEN RAISE EXCEPTION 'Invalid search bounds'; END IF;
  delta_lng := p_radius/(111000*cos(radians(p_lat)));
  SELECT coalesce(jsonb_agg(q.row ORDER BY q.distance,q.id),'[]') INTO result FROM (
    SELECT d.cafe_id AS id,private.place_distance(p_lat,p_lng,d.latitude,d.longitude) AS distance,
      jsonb_build_object('id',d.cafe_id,'name',c.record->>'name','address',c.record->>'address','latitude',d.latitude,'longitude',d.longitude,
        'category',c.record->>'category','is_open',NULL,'opening_hours',NULL,'image_url','','google_place_id',NULL,
        'data_source',c.provider,'attribution',c.record->>'attribution','license',c.record->>'license') AS row
    FROM private.place_directory d JOIN private.place_candidates c ON c.id=d.canonical_record
    WHERE d.state='active' AND c.status='approved'
      AND d.latitude BETWEEN p_lat-p_radius/111000.0 AND p_lat+p_radius/111000.0
      AND d.longitude BETWEEN p_lng-delta_lng AND p_lng+delta_lng
      AND private.place_distance(p_lat,p_lng,d.latitude,d.longitude)<=p_radius
    ORDER BY distance,d.cafe_id LIMIT 200
  ) q;
  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION private.place_distance(double precision,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stage_independent_place(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.publish_independent_place(uuid,text,text,uuid,integer,boolean,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_independent_place_state(uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.search_independent_places(double precision,double precision,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stage_independent_place(jsonb),public.publish_independent_place(uuid,text,text,uuid,integer,boolean,boolean),
  public.set_independent_place_state(uuid,integer,text,text),public.search_independent_places(double precision,double precision,integer) TO service_role;
COMMIT;
