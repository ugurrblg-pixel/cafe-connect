BEGIN;
DO $$
DECLARE jobs jsonb; second_jobs jsonb; chosen text; token uuid; cache_id uuid; total integer;
BEGIN
  IF has_function_privilege('authenticated','public.claim_targeted_place_refresh(double precision,double precision)','EXECUTE')
    OR has_function_privilege('anon','public.finish_targeted_place_refresh(text,uuid,jsonb,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Client gained refresh access'; END IF;
  FOR i IN 1..22 LOOP
    INSERT INTO public.cafes(name,address,latitude,longitude,category,google_place_id,is_open)
      VALUES('Synthetic fixture','',41,29,'cafe','fixture-target-'||i,NULL) RETURNING id INTO cache_id;
    INSERT INTO private.targeted_place_refresh(google_place_id,cafe_id) VALUES('fixture-target-'||i,cache_id);
  END LOOP;
  INSERT INTO public.cafes(name,address,latitude,longitude,category,google_place_id,is_open)
    VALUES('Not scheduled','',41,29,'cafe','fixture-unlisted',NULL);
  jobs:=public.claim_targeted_place_refresh(41,29);
  IF jsonb_array_length(jobs)<>2 THEN RAISE EXCEPTION 'Per-search cap failed'; END IF;
  chosen:=jobs->0->>'place_id';token:=(jobs->0->>'lease_token')::uuid;
  second_jobs:=public.claim_targeted_place_refresh(41,29);
  IF second_jobs @> jsonb_build_array(jobs->0) THEN RAISE EXCEPTION 'Lease replay'; END IF;
  IF public.finish_targeted_place_refresh(chosen,gen_random_uuid(),NULL,false) THEN RAISE EXCEPTION 'Invalid lease accepted'; END IF;
  IF NOT public.finish_targeted_place_refresh(chosen,token,jsonb_build_object('place_id',chosen,'name','Refreshed fixture','latitude',41,'longitude',29,'category','cafe'),false) THEN RAISE EXCEPTION 'Valid lease failed'; END IF;
  IF public.finish_targeted_place_refresh(chosen,token,NULL,false) THEN RAISE EXCEPTION 'Completed lease replayed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.cafes WHERE google_place_id=chosen AND name='Refreshed fixture' AND last_synced_at IS NOT NULL) THEN RAISE EXCEPTION 'Cache not refreshed'; END IF;
  FOR i IN 1..10 LOOP PERFORM public.claim_targeted_place_refresh(41,29); END LOOP;
  SELECT used INTO total FROM private.targeted_place_budget WHERE day=(now() AT TIME ZONE 'UTC')::date;
  IF total<>20 OR public.claim_targeted_place_refresh(41,29)<>'[]'::jsonb THEN RAISE EXCEPTION 'Global daily cap failed'; END IF;
  IF EXISTS(SELECT 1 FROM private.targeted_place_refresh WHERE google_place_id='fixture-unlisted') THEN RAISE EXCEPTION 'Unlisted ID scheduled'; END IF;
END $$;
ROLLBACK;
