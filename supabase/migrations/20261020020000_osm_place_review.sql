BEGIN;
-- Separate ODbL review data. No publication path or public read policy.
CREATE TABLE private.osm_place_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider text NOT NULL CHECK(provider='openstreetmap'),
 source_id text NOT NULL CHECK(source_id ~ '^(node|way|relation)/[1-9][0-9]*$'),
 release text NOT NULL, fingerprint text NOT NULL, record jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,source_id,release,fingerprint)
);
ALTER TABLE private.osm_place_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.osm_place_candidates FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.stage_osm_place(p_record jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE candidate private.osm_place_candidates; v_provider text := p_record->>'provider'; v_license text := p_record->>'license';
  lat double precision; lng double precision; normalized text;
BEGIN
  IF jsonb_typeof(p_record)<>'object' OR v_provider IS NULL OR v_provider <> 'openstreetmap' OR v_license IS DISTINCT FROM 'ODbL-1.0' THEN
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
  INSERT INTO private.osm_place_candidates(provider,source_id,release,fingerprint,record)
  VALUES(v_provider,p_record->>'sourceId',p_record->>'release',md5(p_record::text),p_record)
  ON CONFLICT(provider,source_id,release,fingerprint) DO UPDATE SET record=excluded.record
  RETURNING * INTO candidate;
  RETURN jsonb_build_object('id',candidate.id,'fingerprint',candidate.fingerprint,'status',candidate.status);
END; $$;


REVOKE ALL ON FUNCTION public.stage_osm_place(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stage_osm_place(jsonb) TO service_role;
COMMIT;
