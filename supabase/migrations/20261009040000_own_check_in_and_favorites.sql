-- Applied to the new test backend after explicit user approval, 2026-10-09.
-- No access to other users' attendance, profiles, photos or messages.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.check_in_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_started_at timestamptz,
  last_ended_at timestamptz
);
REVOKE ALL ON private.check_in_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.require_near_cafe(
  target_cafe_id uuid, latitude double precision, longitude double precision
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE cafe_lat double precision; cafe_lng double precision; a double precision;
BEGIN
  IF latitude IS NULL OR longitude IS NULL OR NOT (latitude BETWEEN -90 AND 90)
    OR NOT (longitude BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Valid coordinates required' USING ERRCODE = '22023';
  END IF;
  SELECT c.latitude, c.longitude INTO cafe_lat, cafe_lng
    FROM public.cafes c WHERE c.id = target_cafe_id;
  IF NOT FOUND OR cafe_lat IS NULL OR cafe_lng IS NULL
    OR NOT (cafe_lat BETWEEN -90 AND 90) OR NOT (cafe_lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Cafe location unavailable' USING ERRCODE = '22023';
  END IF;
  a := sin(radians(latitude - cafe_lat) / 2)^2
    + cos(radians(cafe_lat)) * cos(radians(latitude))
    * sin(radians(longitude - cafe_lng) / 2)^2;
  IF 2 * 6371000 * asin(sqrt(least(1.0, greatest(0.0, a)))) > 150 THEN
    RAISE EXCEPTION 'You must be within 150 metres of the cafe' USING ERRCODE = '22023';
  END IF;
END $$;
REVOKE ALL ON FUNCTION private.require_near_cafe(uuid,double precision,double precision)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_own_check_in(
  target_cafe_id uuid, latitude double precision, longitude double precision
) RETURNS SETOF public.check_ins
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE caller uuid := auth.uid(); current_row public.check_ins;
  limits private.check_in_limits; server_time timestamptz := clock_timestamp();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text, 390401));
  IF public.is_user_banned(caller) THEN
    RAISE EXCEPTION 'Account restricted' USING ERRCODE = '42501';
  END IF;
  PERFORM private.require_near_cafe(target_cafe_id, latitude, longitude);
  SELECT * INTO current_row FROM public.check_ins
    WHERE user_id = caller AND cafe_id = target_cafe_id AND expiry_time > server_time
    ORDER BY check_in_time DESC LIMIT 1;
  IF FOUND THEN RETURN NEXT current_row; RETURN; END IF;
  SELECT * INTO limits FROM private.check_in_limits WHERE user_id = caller;
  IF greatest(limits.last_started_at, limits.last_ended_at) > server_time - interval '5 minutes' THEN
    RAISE EXCEPTION 'Please wait 5 minutes before checking in again' USING ERRCODE = '22023';
  END IF;
  -- Replacing attendance is atomic: failed inserts preserve the previous row.
  DELETE FROM public.check_ins WHERE user_id = caller;
  INSERT INTO public.check_ins(user_id,cafe_id,check_in_time,expiry_time,last_active_at)
    VALUES(caller,target_cafe_id,server_time,server_time + interval '60 minutes',server_time)
    RETURNING * INTO current_row;
  INSERT INTO private.check_in_limits(user_id,last_started_at)
    VALUES(caller,server_time) ON CONFLICT(user_id)
    DO UPDATE SET last_started_at = excluded.last_started_at;
  -- Exact coordinates are validated but not retained.
  RETURN NEXT current_row;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_own_check_in(
  target_check_in_id uuid, latitude double precision, longitude double precision
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE caller uuid := auth.uid(); target_cafe uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text, 390401));
  IF public.is_user_banned(caller) THEN
    RAISE EXCEPTION 'Account restricted' USING ERRCODE = '42501';
  END IF;
  SELECT cafe_id INTO target_cafe FROM public.check_ins
    WHERE id = target_check_in_id AND user_id = caller AND expiry_time > clock_timestamp();
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM private.require_near_cafe(target_cafe, latitude, longitude);
  UPDATE public.check_ins SET last_active_at = clock_timestamp()
    WHERE id = target_check_in_id AND user_id = caller;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.end_own_check_in(target_check_in_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE caller uuid := auth.uid(); removed uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text, 390401));
  DELETE FROM public.check_ins WHERE id = target_check_in_id AND user_id = caller
    RETURNING id INTO removed;
  IF removed IS NULL THEN RETURN false; END IF;
  INSERT INTO private.check_in_limits(user_id,last_ended_at) VALUES(caller,clock_timestamp())
    ON CONFLICT(user_id) DO UPDATE SET last_ended_at = excluded.last_ended_at;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.save_own_favorite_venues(venue_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE caller uuid := auth.uid(); ids uuid[] := coalesce(venue_ids, ARRAY[]::uuid[]);
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF cardinality(ids) > 3 OR array_position(ids,NULL) IS NOT NULL
    OR cardinality(ids) <> (SELECT count(DISTINCT chosen.venue_id) FROM unnest(ids) AS chosen(venue_id)) THEN
    RAISE EXCEPTION 'Choose up to three different venues' USING ERRCODE = '22023';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(ids) AS chosen(venue_id) WHERE NOT EXISTS(
    SELECT 1 FROM public.cafes c WHERE c.id = chosen.venue_id)) THEN
    RAISE EXCEPTION 'Venue unavailable' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text, 390402));
  DELETE FROM public.user_favorite_venues WHERE user_id = caller;
  INSERT INTO public.user_favorite_venues(user_id,venue_id)
    SELECT caller,chosen.venue_id FROM unnest(ids) AS chosen(venue_id);
END $$;

-- Replace legacy policies so exact attendance is visible only to its owner.
DO $$ DECLARE item record;
BEGIN
  FOR item IN SELECT tablename,policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('check_ins','user_favorite_venues') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', item.policyname,item.tablename);
  END LOOP;
END $$;
CREATE POLICY own_attendance_read ON public.check_ins FOR SELECT TO authenticated
  USING(user_id = (SELECT auth.uid()));
CREATE POLICY own_favorites_read ON public.user_favorite_venues FOR SELECT TO authenticated
  USING(user_id = (SELECT auth.uid()));
REVOKE ALL ON public.check_ins,public.user_favorite_venues FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.check_ins,public.user_favorite_venues TO authenticated;
REVOKE ALL ON FUNCTION public.start_own_check_in(uuid,double precision,double precision),
 public.refresh_own_check_in(uuid,double precision,double precision),
 public.end_own_check_in(uuid),public.save_own_favorite_venues(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_own_check_in(uuid,double precision,double precision),
 public.refresh_own_check_in(uuid,double precision,double precision),
 public.end_own_check_in(uuid),public.save_own_favorite_venues(uuid[]) TO authenticated;
COMMIT;
