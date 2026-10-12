-- Applied to the new backend after explicit owner-photo approval, 2026-10-09.
BEGIN;
UPDATE storage.buckets SET public=false,file_size_limit=5242880,
 allowed_mime_types=ARRAY['image/webp'] WHERE id='avatars';

CREATE OR REPLACE FUNCTION public.can_upload_own_avatar(object_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid := auth.uid();
BEGIN
 IF caller IS NULL OR object_name IS NULL OR object_name !~ (
   '^' || caller::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$') THEN
   RETURN false;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390501));
 RETURN (SELECT count(*)<5 FROM storage.objects
   WHERE bucket_id='avatars' AND split_part(name,'/',1)=caller::text);
END $$;
REVOKE ALL ON FUNCTION public.can_upload_own_avatar(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_own_avatar(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_delete_own_avatar(object_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid := auth.uid();
BEGIN
 IF caller IS NULL OR object_name IS NULL OR split_part(object_name,'/',1)<>caller::text THEN
  RETURN false;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390501));
 RETURN NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=caller AND (
  p.photo_url='avatar:' || object_name OR ('avatar:' || object_name)=ANY(coalesce(p.photo_urls,ARRAY[]::text[]))));
END $$;
REVOKE ALL ON FUNCTION public.can_delete_own_avatar(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_own_avatar(text) TO authenticated;

DROP POLICY IF EXISTS own_avatar_read ON storage.objects;
DROP POLICY IF EXISTS own_avatar_upload ON storage.objects;
DROP POLICY IF EXISTS own_avatar_delete ON storage.objects;
CREATE POLICY own_avatar_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='avatars' AND split_part(name,'/',1)=(SELECT auth.uid())::text);
CREATE POLICY own_avatar_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='avatars' AND public.can_upload_own_avatar(name));
-- No UPDATE policy: an existing photo cannot be silently overwritten.
CREATE POLICY own_avatar_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='avatars' AND public.can_delete_own_avatar(name));

-- Preserve managed-field protection; a trusted photo RPC may reset only moderation to pending.
CREATE OR REPLACE FUNCTION public.protect_profile_managed_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role() IN ('anon','authenticated') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.is_verified OR NEW.verification_status <> 'none'
    OR NEW.photo_moderation_status <> 'pending' OR NEW.boosted_until IS NOT NULL THEN
    RAISE EXCEPTION 'Managed profile fields require server authorization' USING ERRCODE='42501';
   END IF;
  ELSE
   IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
    OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
    OR (NEW.photo_moderation_status IS DISTINCT FROM OLD.photo_moderation_status AND NOT (
      current_user NOT IN ('anon','authenticated') AND NEW.photo_moderation_status='pending')) THEN
    RAISE EXCEPTION 'Managed profile fields require server authorization' USING ERRCODE='42501';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_profile_managed_fields() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_own_profile_photos(object_paths text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid := auth.uid(); paths text[] := coalesce(object_paths,ARRAY[]::text[]);
 refs text[];
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390501));
 IF cardinality(paths)>5 OR array_position(paths,NULL) IS NOT NULL
  OR cardinality(paths)<>(SELECT count(DISTINCT p.path) FROM unnest(paths) AS p(path)) THEN
  RAISE EXCEPTION 'Choose up to five different photos' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM unnest(paths) AS p(path) WHERE p.path !~ (
   '^' || caller::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$')
   OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='avatars' AND o.name=p.path)) THEN
  RAISE EXCEPTION 'Photo unavailable or not owned by caller' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(array_agg('avatar:' || p.path ORDER BY p.position),ARRAY[]::text[])
  INTO refs FROM unnest(paths) WITH ORDINALITY AS p(path,position);
 UPDATE public.profiles SET photo_url=coalesce(refs[1],''),photo_urls=refs,
  photo_moderation_status='pending' WHERE user_id=caller;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_own_profile_photos(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_own_profile_photos(text[]) TO authenticated;
-- Photo pointers can only be changed through the validated RPC.
REVOKE UPDATE(photo_url,photo_urls,photo_moderation_status) ON public.profiles FROM anon,authenticated;
COMMIT;
