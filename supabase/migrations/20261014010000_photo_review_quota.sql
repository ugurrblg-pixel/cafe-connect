-- Prepared, not automatically applied. Service-only quota, no photo visibility changes.
BEGIN;
CREATE TABLE IF NOT EXISTS private.photo_review_usage(user_id uuid PRIMARY KEY, day date NOT NULL, calls integer NOT NULL, last_call timestamptz NOT NULL);
ALTER TABLE private.photo_review_usage ADD COLUMN IF NOT EXISTS minute_start timestamptz NOT NULL DEFAULT now();
ALTER TABLE private.photo_review_usage ADD COLUMN IF NOT EXISTS minute_calls integer NOT NULL DEFAULT 0;
ALTER TABLE private.photo_review_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.photo_review_usage FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.reserve_photo_review(target_user_id uuid,target_object_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE usage private.photo_review_usage%ROWTYPE; object_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user_id) THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_user_id::text,390509));
 SELECT * INTO usage FROM private.photo_review_usage WHERE user_id=target_user_id;
 SELECT id INTO object_id FROM storage.objects WHERE bucket_id='avatars' AND name=target_object_path AND split_part(name,'/',1)=target_user_id::text;
 IF object_id IS NULL THEN RETURN NULL; END IF;
 IF (usage.minute_start > now()-interval '1 minute' AND usage.minute_calls>=5) OR (usage.day=CURRENT_DATE AND usage.calls>=20) THEN RETURN NULL; END IF;
 INSERT INTO private.photo_review_usage(user_id,day,calls,last_call,minute_start,minute_calls) VALUES(target_user_id,CURRENT_DATE,1,now(),now(),1)
 ON CONFLICT(user_id) DO UPDATE SET day=CURRENT_DATE,calls=CASE WHEN photo_review_usage.day=CURRENT_DATE THEN photo_review_usage.calls+1 ELSE 1 END,last_call=now(),
 minute_calls=CASE WHEN photo_review_usage.minute_start>now()-interval '1 minute' THEN photo_review_usage.minute_calls+1 ELSE 1 END,
 minute_start=CASE WHEN photo_review_usage.minute_start>now()-interval '1 minute' THEN photo_review_usage.minute_start ELSE now() END;
 RETURN object_id;
END $$;
REVOKE ALL ON FUNCTION public.reserve_photo_review(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_photo_review(uuid,text) TO service_role;


CREATE TABLE IF NOT EXISTS private.photo_reviews(object_path text PRIMARY KEY,object_id uuid NOT NULL,user_id uuid NOT NULL,verdict text NOT NULL CHECK(verdict IN ('accepted','rejected')),reviewed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.photo_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.photo_reviews FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.record_photo_review(target_user_id uuid,target_path text,target_object_id uuid,target_verdict text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF target_verdict NOT IN ('accepted','rejected') OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE id=target_object_id AND bucket_id='avatars' AND name=target_path AND split_part(name,'/',1)=target_user_id::text) THEN RETURN false; END IF;
 INSERT INTO private.photo_reviews VALUES(target_path,target_object_id,target_user_id,target_verdict,now()) ON CONFLICT(object_path) DO UPDATE SET object_id=EXCLUDED.object_id,user_id=EXCLUDED.user_id,verdict=EXCLUDED.verdict,reviewed_at=EXCLUDED.reviewed_at;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_photo_review(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_photo_review(uuid,text,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_reviewed_profile_photos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF coalesce(auth.role(),'')<>'authenticated' THEN RETURN NEW; END IF;
 IF auth.role()='authenticated' AND TG_OP='INSERT' THEN
  IF cardinality(coalesce(NEW.photo_urls,ARRAY[]::text[]))>0 OR coalesce(NEW.photo_url,'')<>'' THEN
   RAISE EXCEPTION 'Create profile before adding reviewed photos' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 IF auth.role()='authenticated' AND NEW.photo_url IS DISTINCT FROM coalesce(NEW.photo_urls[1],'') THEN
  RAISE EXCEPTION 'Photo references must match' USING ERRCODE='42501';
 END IF;
 IF auth.role()='authenticated' AND EXISTS(
  SELECT 1 FROM unnest(coalesce(NEW.photo_urls,ARRAY[]::text[])) ref
  WHERE NOT ref=ANY(coalesce(OLD.photo_urls,ARRAY[]::text[])) AND NOT EXISTS(
   SELECT 1 FROM private.photo_reviews r JOIN storage.objects o ON o.id=r.object_id
   WHERE r.user_id=NEW.user_id AND ref='avatar:'||r.object_path AND r.verdict='accepted'
    AND o.bucket_id='avatars' AND o.name=r.object_path)) THEN
  RAISE EXCEPTION 'Photo review required' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_reviewed_profile_photos() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS require_reviewed_photo ON public.profiles;
CREATE TRIGGER require_reviewed_photo BEFORE INSERT OR UPDATE OF photo_urls,photo_url ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_reviewed_profile_photos();
COMMIT;
