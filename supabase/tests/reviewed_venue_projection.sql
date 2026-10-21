BEGIN;
DO $$
DECLARE r jsonb := '{"provider":"overture","sourceId":"synthetic-projection","release":"test","license":"CDLA-Permissive-2.0","attribution":"Synthetic credit","name":"Synthetic Cafe","latitude":40.79,"longitude":29.4,"category":"cafe","address":"","country":"TR","status":"unknown"}';
 c jsonb; venue uuid; rejected boolean;
BEGIN
 c:=public.stage_independent_place(r);
 venue:=public.publish_reviewed_pilot_place((c->>'id')::uuid,c->>'fingerprint','isolated-regression');
 IF NOT EXISTS(SELECT 1 FROM public.cafes WHERE id=venue AND independent_approved AND data_source='overture'
 AND source_license='CDLA-Permissive-2.0' AND source_attribution='Synthetic credit' AND google_place_id IS NULL AND is_open IS NULL)
 THEN RAISE EXCEPTION 'Projection failed'; END IF;
 IF public.publish_reviewed_pilot_place((c->>'id')::uuid,c->>'fingerprint','isolated-regression')<>venue THEN RAISE EXCEPTION 'Identity changed'; END IF;
 PERFORM public.set_independent_place_state(venue,1,'suppressed','isolated-regression');
 IF EXISTS(SELECT 1 FROM public.cafes WHERE id=venue AND independent_approved) THEN RAISE EXCEPTION 'Suppression not projected'; END IF;
 IF has_function_privilege('authenticated','public.publish_reviewed_pilot_place(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Client publication allowed'; END IF;
 INSERT INTO public.cafes(name,latitude,longitude,google_place_id) VALUES('Existing Cafe',40.80,29.44,'synthetic-google-identity');
 c:=public.stage_independent_place(r || '{"sourceId":"duplicate-source","latitude":40.80,"longitude":29.44}'::jsonb);
 rejected:=false;
 BEGIN PERFORM public.publish_reviewed_pilot_place((c->>'id')::uuid,c->>'fingerprint','isolated-regression'); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Google duplicate accepted'; END IF;
END; $$;
ROLLBACK;
