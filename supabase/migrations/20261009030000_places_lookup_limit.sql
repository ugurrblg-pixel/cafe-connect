BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated;
CREATE TABLE private.places_lookup_usage (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 day date NOT NULL, calls integer NOT NULL, last_call timestamptz NOT NULL
);
REVOKE ALL ON private.places_lookup_usage FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.reserve_places_lookup(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE usage_row private.places_lookup_usage; total_calls integer;
BEGIN
 -- Serialize the quota check and reservation across all function instances.
 PERFORM pg_advisory_xact_lock(73194521);
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user_id) THEN RETURN false; END IF;
 SELECT * INTO usage_row FROM private.places_lookup_usage WHERE user_id=target_user_id;
 IF FOUND AND (usage_row.last_call > now()-interval '60 seconds'
    OR (usage_row.day=CURRENT_DATE AND usage_row.calls>=20)) THEN RETURN false; END IF;
 SELECT coalesce(sum(calls),0) INTO total_calls FROM private.places_lookup_usage WHERE day=CURRENT_DATE;
 IF total_calls>=100 THEN RETURN false; END IF;
 INSERT INTO private.places_lookup_usage(user_id,day,calls,last_call)
 VALUES(target_user_id,CURRENT_DATE,1,now()) ON CONFLICT(user_id) DO UPDATE
 SET day=CURRENT_DATE,calls=CASE WHEN places_lookup_usage.day=CURRENT_DATE
 THEN places_lookup_usage.calls+1 ELSE 1 END,last_call=now();
 RETURN true;
END $function$;
REVOKE ALL ON FUNCTION public.reserve_places_lookup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_places_lookup(uuid) TO service_role;
COMMIT;
