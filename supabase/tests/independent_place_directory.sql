-- Run against an isolated database after the directory migration. No live accounts or Google data.
BEGIN;
DO $$
DECLARE r jsonb := '{"provider":"overture","sourceId":"fixture-1","release":"test-1","license":"CC0-1.0","attribution":"Synthetic fixture","name":"Fixture Coffee","latitude":41,"longitude":29,"category":"cafe","address":"","country":"TR","status":"unknown"}';
  s jsonb; s2 jsonb; target uuid; count_before integer; failed boolean;
BEGIN
  IF has_function_privilege('anon','public.stage_independent_place(jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.publish_independent_place(uuid,text,text,uuid,integer,boolean,boolean)','EXECUTE')
    OR has_function_privilege('authenticated','public.search_independent_places(double precision,double precision,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Client role gained directory privileges';
  END IF;
  SELECT count(*) INTO count_before FROM public.cafes;
  s := public.stage_independent_place(r);
  IF public.stage_independent_place(r)->>'id' <> s->>'id' THEN RAISE EXCEPTION 'Stage not idempotent'; END IF;
  IF jsonb_array_length(public.search_independent_places(41,29,1500))<>0 THEN RAISE EXCEPTION 'Unreviewed record visible'; END IF;
  target := public.publish_independent_place((s->>'id')::uuid,s->>'fingerprint','fixture-reviewer');
  IF public.publish_independent_place((s->>'id')::uuid,s->>'fingerprint','fixture-reviewer')<>target THEN RAISE EXCEPTION 'Publish not idempotent'; END IF;
  IF (SELECT count(*) FROM public.cafes)<>count_before+1 THEN RAISE EXCEPTION 'Duplicate cafe created'; END IF;
  IF jsonb_array_length(public.search_independent_places(41,29,1500))<>1 THEN RAISE EXCEPTION 'Reviewed record absent'; END IF;
  IF jsonb_array_length(public.search_independent_places(42,29,1500))<>0 THEN RAISE EXCEPTION 'Distance filter failed'; END IF;
  s2 := public.stage_independent_place(r || '{"release":"test-2","name":"Fixture Renamed"}');
  failed := false;
  BEGIN
    PERFORM public.publish_independent_place((s2->>'id')::uuid,s2->>'fingerprint','fixture-reviewer',target,1,true,false);
  EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Unconfirmed rename accepted'; END IF;
  PERFORM public.publish_independent_place((s2->>'id')::uuid,s2->>'fingerprint','fixture-reviewer',target,1,true,true);
  IF (SELECT name FROM public.cafes WHERE id=target)<>'Fixture Renamed' THEN RAISE EXCEPTION 'Confirmed rename absent'; END IF;
  failed := false;
  BEGIN
    PERFORM public.set_independent_place_state(target,1,'closed','fixture-reviewer');
  EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Stale review accepted'; END IF;
  PERFORM public.set_independent_place_state(target,2,'closed','fixture-reviewer');
  IF jsonb_array_length(public.search_independent_places(41,29,1500))<>0 THEN RAISE EXCEPTION 'Closed venue visible'; END IF;
  failed := false;
  BEGIN PERFORM public.stage_independent_place(r || '{"provider":"google"}'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Google accepted as independent'; END IF;
  failed := false;
  BEGIN PERFORM public.stage_independent_place(r || '{"latitude":null}'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Missing coordinate accepted'; END IF;
  failed := false;
  BEGIN PERFORM public.stage_independent_place(r || '{"name":"ÇAY OCAĞI"}'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Excluded venue accepted'; END IF;
  failed := false;
  BEGIN PERFORM public.stage_independent_place(r || '{"image_url":"https://example.invalid/photo.jpg"}'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Unlicensed photo field accepted'; END IF;
END $$;
ROLLBACK;
