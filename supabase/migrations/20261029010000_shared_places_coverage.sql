BEGIN;
-- A completed 2.8km Nearby Search covers a 2km user search only when the two
-- centers are at most 800m apart. Never infer completeness from row counts.
CREATE OR REPLACE FUNCTION public.has_fresh_places_coverage(p_lat double precision,p_lng double precision)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $function$
BEGIN
 IF p_lat IS NULL OR p_lng IS NULL OR NOT(p_lat BETWEEN -85 AND 85) OR NOT(p_lng BETWEEN -180 AND 180) THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
 RETURN EXISTS(
  SELECT 1 FROM private.places_search_areas a
  WHERE a.last_success_at > now()-interval '28 days'
  AND a.area_key ~ '^-?[0-9]{1,5}:-?[0-9]{1,5}$'
  AND 6371000.0*2*asin(sqrt(least(1.0,greatest(0.0,
   sin(radians((split_part(a.area_key,':',1)::float8/100.0-p_lat)/2))^2
   +cos(radians(p_lat))*cos(radians(split_part(a.area_key,':',1)::float8/100.0))
   *sin(radians((split_part(a.area_key,':',2)::float8/100.0-p_lng)/2))^2
  )))) <= 800.0
 );
END $function$;
REVOKE ALL ON FUNCTION public.has_fresh_places_coverage(double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_fresh_places_coverage(double precision,double precision) TO service_role;
-- One successful reservation can execute four Nearby Search category requests.
-- Cap interactive discovery at 25 reservations (= at most 100 attempts/day),
-- down from 100 reservations (=400). Retain the per-user and minute guards.
CREATE OR REPLACE FUNCTION public.reserve_places_lookup(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $budget$
DECLARE usage_row private.places_lookup_usage; total_calls integer; budget_day date:=(now() AT TIME ZONE 'UTC')::date;
BEGIN
 PERFORM pg_advisory_xact_lock(73194521);
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user_id) THEN RETURN false; END IF;
 SELECT * INTO usage_row FROM private.places_lookup_usage WHERE user_id=target_user_id;
 IF FOUND AND (usage_row.last_call>now()-interval '60 seconds' OR (usage_row.day=budget_day AND usage_row.calls>=20)) THEN RETURN false; END IF;
 SELECT coalesce(sum(calls),0) INTO total_calls FROM private.places_lookup_usage WHERE day=budget_day;
 IF total_calls>=25 THEN RETURN false; END IF;
 INSERT INTO private.places_lookup_usage(user_id,day,calls,last_call) VALUES(target_user_id,budget_day,1,now())
 ON CONFLICT(user_id) DO UPDATE SET day=budget_day,calls=CASE WHEN places_lookup_usage.day=budget_day THEN places_lookup_usage.calls+1 ELSE 1 END,last_call=now();
 RETURN true;
END $budget$;
REVOKE ALL ON FUNCTION public.reserve_places_lookup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_places_lookup(uuid) TO service_role;
COMMIT;
