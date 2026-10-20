BEGIN;
DO $$
DECLARE r jsonb := '{"provider":"openstreetmap","sourceId":"node/123","release":"synthetic-test","license":"ODbL-1.0","attribution":"OpenStreetMap contributors","name":"Test Cafe","latitude":40.77,"longitude":29.4,"category":"cafe","address":"","country":"TR","status":"unknown"}';
 a jsonb; b jsonb; rejected boolean;
BEGIN
 a := public.stage_osm_place(r); b := public.stage_osm_place(r);
 IF a->>'id' IS DISTINCT FROM b->>'id' THEN RAISE EXCEPTION 'Duplicate import'; END IF;
 IF has_function_privilege('authenticated','public.stage_osm_place(jsonb)','EXECUTE')
 OR has_table_privilege('anon','private.osm_place_candidates','SELECT') THEN RAISE EXCEPTION 'Unexpected client access'; END IF;
 rejected:=false;
 BEGIN PERFORM public.stage_osm_place(r || '{"license":"CC0-1.0"}'::jsonb);
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Wrong license accepted'; END IF;
 rejected:=false;
 BEGIN PERFORM public.stage_osm_place(r || '{"sourceId":"way/-1"}'::jsonb);
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Invalid source ID accepted'; END IF;
END; $$;
ROLLBACK;
