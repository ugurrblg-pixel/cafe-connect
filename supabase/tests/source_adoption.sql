BEGIN;
DO $$
DECLARE r jsonb := '{"provider":"overture","sourceId":"adoption-fixture","release":"test","license":"CC0-1.0","attribution":"Fixture credit","name":"Adoption Fixture Cafe","latitude":40.77,"longitude":29.4,"category":"cafe","country":"TR","address":"Open source address","status":"unknown"}';
 g uuid;
BEGIN
 PERFORM public.stage_independent_place(r);
 INSERT INTO public.cafes(name,latitude,longitude,category,google_place_id,last_synced_at)
 VALUES('Adoption Fixture Cafe',40.77,29.4,'cafe','adoption-fixture-google',now()) RETURNING id INTO g;
 IF public.adopt_matching_open_sources(40.77,29.4)<>1 THEN RAISE EXCEPTION 'Expected unique adoption'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cafes WHERE id=g AND google_place_id='adoption-fixture-google' AND data_source='overture'
 AND address='Open source address' AND source_license='CC0-1.0' AND independent_approved) THEN RAISE EXCEPTION 'Identity/source lost'; END IF;
 UPDATE public.cafes SET name='Old Google result',address='Wrong old address' WHERE id=g;
 IF NOT EXISTS(SELECT 1 FROM public.cafes WHERE id=g AND name='Adoption Fixture Cafe' AND address='Open source address') THEN RAISE EXCEPTION 'Source overwritten'; END IF;
 IF public.adopt_matching_open_sources(40.77,29.4)<>0 THEN RAISE EXCEPTION 'Not idempotent'; END IF;
 IF has_function_privilege('authenticated','public.adopt_matching_open_sources(float8,float8)','EXECUTE') THEN RAISE EXCEPTION 'Client mutation privilege'; END IF;
END; $$;
ROLLBACK;
