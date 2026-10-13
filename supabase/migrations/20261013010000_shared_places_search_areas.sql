BEGIN;
-- Area buckets contain no user identity or precise user coordinates.
CREATE TABLE IF NOT EXISTS private.places_search_areas (
 area_key text PRIMARY KEY,
 last_success_at timestamptz,
 retry_after timestamptz,
 lease_token uuid,
 lease_until timestamptz
);
ALTER TABLE private.places_search_areas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.places_search_areas FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.claim_places_search_area(target_area_key text,target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE area private.places_search_areas; token uuid;
BEGIN
 IF target_area_key IS NULL OR target_area_key !~ '^-?[0-9]{1,5}:-?[0-9]{1,5}$'
 THEN RAISE EXCEPTION 'Invalid area'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_area_key,73194522));
 SELECT * INTO area FROM private.places_search_areas WHERE area_key=target_area_key;
 IF area.last_success_at>now()-interval '28 days' THEN
  RETURN jsonb_build_object('state','cache');
 END IF;
 IF area.lease_until>now() OR area.retry_after>now() THEN
  RETURN jsonb_build_object('state','wait');
 END IF;
 IF NOT public.reserve_places_lookup(target_user_id) THEN
  RETURN jsonb_build_object('state','quota');
 END IF;
 token:=gen_random_uuid();
 INSERT INTO private.places_search_areas(area_key,lease_token,lease_until)
 VALUES(target_area_key,token,now()+interval '90 seconds')
 ON CONFLICT(area_key) DO UPDATE SET lease_token=token,lease_until=now()+interval '90 seconds';
 RETURN jsonb_build_object('state','reserved','lease_token',token);
END $function$;

CREATE OR REPLACE FUNCTION public.finish_places_search_area(target_area_key text,target_lease_token uuid,completed boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
BEGIN
 UPDATE private.places_search_areas SET
 last_success_at=CASE WHEN completed THEN now() ELSE last_success_at END,
 retry_after=CASE WHEN completed THEN NULL ELSE now()+interval '5 minutes' END,
 lease_until=NULL,lease_token=NULL
 WHERE area_key=target_area_key AND lease_token=target_lease_token;
 RETURN FOUND;
END $function$;
REVOKE ALL ON FUNCTION public.claim_places_search_area(text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_places_search_area(text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_places_search_area(text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_places_search_area(text,uuid,boolean) TO service_role;
COMMIT;
