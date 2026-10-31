BEGIN;
-- A normal visitor search must not override the owner's explicit comparison
-- decision using the older, weaker name/category/distance-only rule.
DO $guard$
DECLARE definition text; marker text := 'AND c.status=''pending'' AND c.record->>''status''=''unknown''';
BEGIN
 SELECT pg_get_functiondef('public.adopt_matching_open_sources(double precision,double precision)'::regprocedure) INTO definition;
 IF position('candidate_google_checks' in definition)=0 THEN
  IF position(marker in definition)=0 THEN RAISE EXCEPTION 'Source adoption definition changed; inspect before patching'; END IF;
  EXECUTE replace(definition,marker,marker || E'\n    AND NOT EXISTS(SELECT 1 FROM private.candidate_google_checks checked WHERE checked.candidate_id=c.id AND checked.fingerprint=c.fingerprint)');
 END IF;
END $guard$;
COMMIT;
