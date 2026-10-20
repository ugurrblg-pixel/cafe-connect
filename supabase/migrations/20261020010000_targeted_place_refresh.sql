BEGIN;
-- Only identifiers and operational scheduling live here. Google content remains in its bounded cache.
CREATE TABLE private.place_google_review (
  candidate_id uuid PRIMARY KEY REFERENCES private.place_candidates(id),
  google_place_id text,
  task text NOT NULL CHECK(task IN ('matched','needs_id','needs_review')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.targeted_place_refresh (
  google_place_id text PRIMARY KEY CHECK(length(google_place_id) BETWEEN 1 AND 300),
  cafe_id uuid NOT NULL REFERENCES public.cafes(id),
  needs_refresh boolean NOT NULL DEFAULT true,
  next_refresh_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  last_checked_at timestamptz,
  failures integer NOT NULL DEFAULT 0
);
CREATE TABLE private.targeted_place_budget (
  day date PRIMARY KEY,
  used integer NOT NULL DEFAULT 0 CHECK(used BETWEEN 0 AND 20)
);
ALTER TABLE private.place_google_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.targeted_place_refresh ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.targeted_place_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.place_google_review,private.targeted_place_refresh,private.targeted_place_budget FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.claim_targeted_place_refresh(p_lat double precision,p_lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE remaining integer; result jsonb;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -85 AND 85 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid bounds'; END IF;
  PERFORM pg_advisory_xact_lock(20001001);
  INSERT INTO private.targeted_place_budget(day) VALUES((now() AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING;
  SELECT 20-used INTO remaining FROM private.targeted_place_budget WHERE day=(now() AT TIME ZONE 'UTC')::date FOR UPDATE;
  IF remaining<=0 THEN RETURN '[]'; END IF;
  WITH picked AS (
    SELECT w.google_place_id FROM private.targeted_place_refresh w JOIN public.cafes c ON c.id=w.cafe_id
    WHERE w.needs_refresh AND w.next_refresh_at<=now() AND (w.lease_until IS NULL OR w.lease_until<now())
      AND c.google_place_id=w.google_place_id AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      AND private.place_distance(p_lat,p_lng,c.latitude,c.longitude)<=1500
    ORDER BY w.next_refresh_at,w.google_place_id LIMIT least(2,remaining)
    FOR UPDATE OF w SKIP LOCKED
  ), claimed AS (
    UPDATE private.targeted_place_refresh w SET lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',next_refresh_at=now()+interval '1 hour'
    FROM picked p WHERE w.google_place_id=p.google_place_id RETURNING w.google_place_id,w.lease_token
  ) SELECT coalesce(jsonb_agg(jsonb_build_object('place_id',google_place_id,'lease_token',lease_token)),'[]') INTO result FROM claimed;
  UPDATE private.targeted_place_budget SET used=used+jsonb_array_length(result) WHERE day=(now() AT TIME ZONE 'UTC')::date;
  RETURN result;
END; $$;

CREATE FUNCTION public.finish_targeted_place_refresh(p_place_id text,p_lease uuid,p_payload jsonb DEFAULT NULL,p_retired boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w private.targeted_place_refresh; lat double precision; lng double precision;
BEGIN
  SELECT * INTO w FROM private.targeted_place_refresh WHERE google_place_id=p_place_id AND lease_token=p_lease AND lease_until>=now() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_retired THEN
    -- Keep historical cafe identity; remove unavailable cached descriptive fields.
    UPDATE public.cafes SET name='Mekan bilgisi kullanılamıyor',address='',latitude=NULL,longitude=NULL,is_open=NULL,
      opening_hours=NULL,image_url='',rating=NULL,last_synced_at=NULL WHERE id=w.cafe_id AND google_place_id=p_place_id;
    UPDATE private.targeted_place_refresh SET needs_refresh=false,last_checked_at=now(),lease_token=NULL,lease_until=NULL WHERE google_place_id=p_place_id;
    RETURN true;
  END IF;
  IF p_payload IS NULL THEN
    UPDATE private.targeted_place_refresh SET failures=failures+1,next_refresh_at=now()+interval '6 hours',lease_token=NULL,lease_until=NULL WHERE google_place_id=p_place_id;
    RETURN false;
  END IF;
  IF p_payload->>'place_id' IS DISTINCT FROM p_place_id OR coalesce(length(btrim(p_payload->>'name')),0) NOT BETWEEN 1 AND 200
    OR coalesce(p_payload->>'category','') NOT IN ('cafe','bar','night_club','gym')
    OR jsonb_typeof(p_payload->'latitude') IS DISTINCT FROM 'number' OR jsonb_typeof(p_payload->'longitude') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid refresh payload'; END IF;
  lat := (p_payload->>'latitude')::float8; lng := (p_payload->>'longitude')::float8;
  IF lat NOT BETWEEN -85 AND 85 OR lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid refresh coordinates'; END IF;
  UPDATE public.cafes SET name=p_payload->>'name',latitude=lat,longitude=lng,category=p_payload->>'category',
    address='',image_url='',opening_hours=NULL,rating=NULL,is_open=NULL,last_synced_at=now() WHERE id=w.cafe_id AND google_place_id=p_place_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cached identity changed'; END IF;
  UPDATE private.targeted_place_refresh SET last_checked_at=now(),next_refresh_at=now()+interval '7 days',failures=0,lease_token=NULL,lease_until=NULL WHERE google_place_id=p_place_id;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_targeted_place_refresh(double precision,double precision) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_targeted_place_refresh(text,uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_targeted_place_refresh(double precision,double precision),public.finish_targeted_place_refresh(text,uuid,jsonb,boolean) TO service_role;
COMMIT;
