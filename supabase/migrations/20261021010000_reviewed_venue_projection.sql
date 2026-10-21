BEGIN;
ALTER TABLE public.cafes ADD COLUMN data_source text,
 ADD COLUMN source_attribution text, ADD COLUMN source_license text,
 ADD COLUMN independent_approved boolean NOT NULL DEFAULT false;

-- Project only reviewed business metadata into the already-readable cafes table.
CREATE FUNCTION private.project_reviewed_place() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c private.place_candidates;
BEGIN
 SELECT * INTO c FROM private.place_candidates WHERE id=NEW.canonical_record;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing canonical source'; END IF;
 UPDATE public.cafes SET data_source=c.provider,source_attribution=c.record->>'attribution',
   source_license=c.record->>'license',independent_approved=(NEW.state='active')
 WHERE id=NEW.cafe_id AND google_place_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cannot overwrite Google identity'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.project_reviewed_place() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER project_reviewed_place AFTER INSERT OR UPDATE ON private.place_directory
 FOR EACH ROW EXECUTE FUNCTION private.project_reviewed_place();

-- An explicit operator decision is still required; this only guards the first pilot batch.
CREATE FUNCTION public.publish_reviewed_pilot_place(p_candidate uuid,p_fingerprint text,p_reviewer text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c private.place_candidates; lat float8; lng float8;
BEGIN
 PERFORM pg_advisory_xact_lock(19001001);
 SELECT * INTO c FROM private.place_candidates WHERE id=p_candidate FOR UPDATE;
 IF NOT FOUND OR c.fingerprint IS DISTINCT FROM p_fingerprint THEN RAISE EXCEPTION 'Candidate changed'; END IF;
 lat:=(c.record->>'latitude')::float8; lng:=(c.record->>'longitude')::float8;
 IF lat NOT BETWEEN 40.64 AND 40.85 OR lng NOT BETWEEN 29.28 AND 29.47 OR c.record->>'category'<>'cafe'
 OR c.provider NOT IN ('overture','alltheplaces') THEN RAISE EXCEPTION 'Outside reviewed pilot scope'; END IF;
 IF EXISTS(SELECT 1 FROM public.cafes x WHERE x.google_place_id IS NOT NULL
   AND x.latitude IS NOT NULL AND x.longitude IS NOT NULL
   AND (private.place_distance(lat,lng,x.latitude,x.longitude)<=120
     OR (lower(x.name)=lower(c.record->>'name') AND private.place_distance(lat,lng,x.latitude,x.longitude)<=2000)))
 THEN RAISE EXCEPTION 'Existing Google venue requires identity review'; END IF;
 RETURN public.publish_independent_place(c.id,c.fingerprint,p_reviewer);
END; $$;
REVOKE ALL ON FUNCTION public.publish_reviewed_pilot_place(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_reviewed_pilot_place(uuid,text,text) TO service_role;
COMMIT;
