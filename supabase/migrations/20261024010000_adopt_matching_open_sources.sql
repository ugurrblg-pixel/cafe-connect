BEGIN;
CREATE TABLE private.google_source_adoptions (
 cafe_id uuid PRIMARY KEY REFERENCES public.cafes(id),
 candidate_id uuid NOT NULL UNIQUE REFERENCES private.place_candidates(id),
 google_place_id text NOT NULL, adopted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.google_source_adoptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.google_source_adoptions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.source_match_name(v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT btrim(regexp_replace(lower(translate(v,'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu')),'[^a-z0-9]+',' ','g'));
$$;
REVOKE ALL ON FUNCTION private.source_match_name(text) FROM PUBLIC,anon,authenticated;

-- Preserve the adopted independent fields even if an older Google lease finishes later.
CREATE FUNCTION private.protect_adopted_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb;
BEGIN
 SELECT c.record INTO r FROM private.google_source_adoptions a JOIN private.place_candidates c ON c.id=a.candidate_id WHERE a.cafe_id=OLD.id;
 IF FOUND THEN
  NEW.google_place_id:=OLD.google_place_id;
  NEW.name:=r->>'name'; NEW.address:=r->>'address'; NEW.latitude:=(r->>'latitude')::float8; NEW.longitude:=(r->>'longitude')::float8;
  NEW.category:=r->>'category'; NEW.image_url:=''; NEW.rating:=NULL; NEW.opening_hours:=NULL; NEW.is_open:=NULL;
  NEW.data_source:=r->>'provider'; NEW.source_attribution:=r->>'attribution'; NEW.source_license:=r->>'license'; NEW.independent_approved:=true;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.protect_adopted_source() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_adopted_source BEFORE UPDATE ON public.cafes FOR EACH ROW EXECUTE FUNCTION private.protect_adopted_source();

CREATE FUNCTION public.adopt_matching_open_sources(p_lat float8,p_lng float8) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pair record; total integer:=0;
BEGIN
 IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN 40.64 AND 40.85 OR p_lng NOT BETWEEN 29.28 AND 29.47 THEN RETURN 0; END IF;
 -- Skip concurrent adoption work rather than queueing user searches.
 IF NOT pg_try_advisory_xact_lock(19001001) THEN RETURN 0; END IF;
 FOR pair IN
  WITH matches AS (
   SELECT g.id cafe_id,g.google_place_id,c.id candidate_id,
     count(*) OVER(PARTITION BY g.id) google_matches,count(*) OVER(PARTITION BY c.id) source_matches
   FROM public.cafes g JOIN private.place_candidates c ON c.provider IN ('overture','alltheplaces')
    AND c.status='pending' AND c.record->>'status'='unknown'
    AND c.record->>'license' IN ('CDLA-Permissive-2.0','CC0-1.0')
    AND c.record->>'category'=g.category AND private.source_match_name(c.record->>'name')=private.source_match_name(g.name)
    AND private.place_distance(g.latitude,g.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)<=25
   WHERE g.google_place_id IS NOT NULL AND g.data_source IS NULL AND g.last_synced_at BETWEEN now()-interval '28 days' AND now()+interval '1 minute'
    AND g.latitude BETWEEN p_lat-0.014 AND p_lat+0.014 AND g.longitude BETWEEN p_lng-0.02 AND p_lng+0.02
    AND private.place_distance(p_lat,p_lng,g.latitude,g.longitude)<=1500
    AND NOT EXISTS(SELECT 1 FROM private.place_source_links l WHERE l.provider=c.provider AND l.source_id=c.source_id)
    AND NOT EXISTS(SELECT 1 FROM private.google_source_adoptions a WHERE a.candidate_id=c.id)
    AND NOT EXISTS(SELECT 1 FROM public.cafes other WHERE other.id<>g.id AND other.google_place_id IS NOT NULL
      AND private.source_match_name(other.name)=private.source_match_name(c.record->>'name')
      AND private.place_distance(other.latitude,other.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)<=25)
  ) SELECT * FROM matches WHERE google_matches=1 AND source_matches=1 ORDER BY cafe_id LIMIT 10
 LOOP
  -- Same lock order as Google finish: job first, cafe second.
  PERFORM 1 FROM private.targeted_place_refresh WHERE google_place_id=pair.google_place_id FOR UPDATE;
  PERFORM 1 FROM public.cafes WHERE id=pair.cafe_id AND data_source IS NULL FOR UPDATE;
  IF NOT FOUND THEN CONTINUE; END IF;
  -- A Google refresh may have completed while waiting for its lease lock.
  PERFORM 1 FROM public.cafes g JOIN private.place_candidates c ON c.id=pair.candidate_id
   WHERE g.id=pair.cafe_id AND g.google_place_id=pair.google_place_id AND g.data_source IS NULL
    AND c.status='pending' AND c.record->>'status'='unknown'
    AND c.record->>'category'=g.category
    AND private.source_match_name(c.record->>'name')=private.source_match_name(g.name)
    AND private.place_distance(g.latitude,g.longitude,(c.record->>'latitude')::float8,(c.record->>'longitude')::float8)<=25;
  IF NOT FOUND THEN CONTINUE; END IF;
  INSERT INTO private.google_source_adoptions(cafe_id,candidate_id,google_place_id) VALUES(pair.cafe_id,pair.candidate_id,pair.google_place_id);
  UPDATE public.cafes SET independent_approved=true WHERE id=pair.cafe_id;
  UPDATE private.targeted_place_refresh SET needs_refresh=false,lease_token=NULL,lease_until=NULL WHERE google_place_id=pair.google_place_id;
  INSERT INTO private.place_directory_audit(cafe_id,candidate_id,reviewer,action,details)
   VALUES(NULL,pair.candidate_id,'owner-authorized exact source adoption','source_adoption',jsonb_build_object('rule','unique_same_name_category_25m','existing_cafe_id',pair.cafe_id));
  total:=total+1;
 END LOOP;
 RETURN total;
END; $$;
REVOKE ALL ON FUNCTION public.adopt_matching_open_sources(float8,float8) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.adopt_matching_open_sources(float8,float8) TO service_role;
COMMIT;
