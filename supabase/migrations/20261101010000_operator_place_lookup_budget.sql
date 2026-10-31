BEGIN;
-- Existing service operators only; shares the 20/day maintenance budget and lock
-- with candidate checks. No user coordinates or search text are persisted.
CREATE FUNCTION public.reserve_operator_place_lookup() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE budget_day date:=(now() AT TIME ZONE 'UTC')::date; used_today integer;
BEGIN
 PERFORM pg_advisory_xact_lock(20001001);
 INSERT INTO private.targeted_place_budget(day) VALUES(budget_day) ON CONFLICT DO NOTHING;
 SELECT used INTO used_today FROM private.targeted_place_budget WHERE day=budget_day FOR UPDATE;
 IF used_today>=20 THEN RETURN false; END IF;
 UPDATE private.targeted_place_budget SET used=used+1 WHERE day=budget_day;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_operator_place_lookup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_operator_place_lookup() TO service_role;
COMMIT;
