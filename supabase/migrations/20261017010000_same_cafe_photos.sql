-- Scoped photo access: no general profile SELECT or Storage read policy is added.
BEGIN;
CREATE TABLE private.cafe_photo_release(singleton boolean PRIMARY KEY CHECK(singleton),enabled_at timestamptz NOT NULL);
ALTER TABLE private.cafe_photo_release ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.cafe_photo_release FROM PUBLIC,anon,authenticated;
INSERT INTO private.cafe_photo_release VALUES(true,clock_timestamp());
CREATE FUNCTION public.list_current_cafe_profiles(target_cafe_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.check_in_time DESC,q.id) FROM (
  SELECT m.*,coalesce((SELECT array_agg(ref ORDER BY position) FROM public.profiles p
   CROSS JOIN LATERAL unnest(p.photo_urls) WITH ORDINALITY AS photos(ref,position)
   JOIN private.photo_reviews r ON ref='avatar:'||r.object_path AND r.user_id=p.user_id AND r.verdict='accepted'
   JOIN storage.objects o ON o.id=r.object_id AND o.bucket_id='avatars' AND o.name=r.object_path
   WHERE p.user_id=m.user_id AND position<=5
    AND public.authorize_current_cafe_photo(auth.uid(),target_cafe_id,r.object_path)=o.id),ARRAY[]::text[]) AS photo_refs
  FROM public.list_current_cafe_members(target_cafe_id) m
 ) q),'[]'::jsonb);
END $$;
CREATE FUNCTION public.authorize_current_cafe_photo(viewer_id uuid,target_cafe_id uuid,photo_path text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target_id uuid; result uuid;
BEGIN
 IF viewer_id IS NULL OR target_cafe_id IS NULL OR photo_path IS NULL OR photo_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' THEN RETURN NULL; END IF;
 target_id:=split_part(photo_path,'/',1)::uuid;
 IF target_id=viewer_id OR public.is_user_banned(viewer_id) OR public.is_user_banned(target_id) THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=viewer_id AND is_visible)
  OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=target_id AND is_visible AND ('avatar:'||photo_path)=ANY(photo_urls))
  OR NOT EXISTS(SELECT 1 FROM public.check_ins WHERE user_id=viewer_id AND cafe_id=target_cafe_id AND expiry_time>now()
   AND check_in_time>=(SELECT enabled_at FROM private.cafe_photo_release WHERE singleton))
  OR NOT EXISTS(SELECT 1 FROM public.check_ins WHERE user_id=target_id AND cafe_id=target_cafe_id AND expiry_time>now()
   AND check_in_time>=(SELECT enabled_at FROM private.cafe_photo_release WHERE singleton))
  OR EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=viewer_id AND blocked_id=target_id) OR (blocker_id=target_id AND blocked_id=viewer_id)) THEN RETURN NULL; END IF;
 SELECT o.id INTO result FROM storage.objects o JOIN private.photo_reviews r ON r.object_id=o.id AND r.object_path=o.name
 WHERE o.bucket_id='avatars' AND o.name=photo_path AND r.user_id=target_id AND r.verdict='accepted';
 RETURN result;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.list_current_cafe_profiles(uuid),public.authorize_current_cafe_photo(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_current_cafe_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_current_cafe_photo(uuid,uuid,text) TO service_role;
COMMIT;
