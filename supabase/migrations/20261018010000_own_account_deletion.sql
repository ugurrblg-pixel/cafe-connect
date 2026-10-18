-- Caller identity and recent sign-in are validated by delete-account, never supplied by the browser.
BEGIN;
CREATE TABLE private.account_deletions (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE private.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_deletions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.get_own_account_deletion()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM private.account_deletions WHERE user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_own_account_deletion() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_account_deletion() TO authenticated;

-- Preserve the remaining participant's own messages when an account disappears.
ALTER TABLE public.conversations ALTER COLUMN user1_id DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN user2_id DROP NOT NULL;
ALTER TABLE public.conversations DROP CONSTRAINT conversations_user1_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT conversations_user2_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user1_id_fkey FOREIGN KEY(user1_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user2_id_fkey FOREIGN KEY(user2_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM private.account_deletions WHERE user_id=_user_id)
 OR EXISTS(SELECT 1 FROM public.user_bans WHERE user_id=_user_id AND is_active AND (expires_at IS NULL OR expires_at>now()));
$$;

-- Shared lock also closes an upload/profile-write race with the start of deletion.
CREATE FUNCTION private.prevent_departing_user_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_SCHEMA='storage' THEN
  IF NEW.bucket_id NOT IN ('avatars','verification-selfies') THEN RETURN NEW; END IF;
  BEGIN target:=split_part(NEW.name,'/',1)::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NEW; END;
 ELSE target:=NEW.user_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target::text,390518));
 IF EXISTS(SELECT 1 FROM private.account_deletions WHERE user_id=target) THEN
  RAISE EXCEPTION 'Account deletion in progress' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.prevent_departing_user_write() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER prevent_departing_profile_write BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.prevent_departing_user_write();
CREATE TRIGGER prevent_departing_photo_write BEFORE INSERT OR UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION private.prevent_departing_user_write();

CREATE FUNCTION public.prepare_account_deletion(target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF target_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user_id) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_user_id::text,390518));
 IF NOT EXISTS(SELECT 1 FROM private.account_deletions WHERE user_id=target_user_id) THEN
  UPDATE public.profiles SET is_visible=false,allow_dms=false WHERE user_id=target_user_id;
  UPDATE public.check_ins SET expiry_time=least(expiry_time,clock_timestamp()) WHERE user_id=target_user_id;
  UPDATE public.conversations SET is_active=false WHERE target_user_id IN(user1_id,user2_id);
  UPDATE private.account_verifications SET status='withdrawn' WHERE user_id=target_user_id AND status='pending';
  INSERT INTO private.account_deletions(user_id) VALUES(target_user_id);
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name)) FROM (
  SELECT bucket_id,name FROM storage.objects WHERE bucket_id IN ('avatars','verification-selfies') AND split_part(name,'/',1)=target_user_id::text ORDER BY bucket_id,name LIMIT 100
 ) o),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;

-- Auth's hard delete and all relational cleanup commit together. Storage bytes are removed
-- through the Storage API first; never remove storage.objects rows with SQL in production.
CREATE FUNCTION private.purge_departing_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM private.account_deletions WHERE user_id=OLD.id) THEN RETURN OLD; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(OLD.id::text,390518));
 IF EXISTS(SELECT 1 FROM storage.objects WHERE owner_id=OLD.id::text OR (bucket_id IN ('avatars','verification-selfies') AND split_part(name,'/',1)=OLD.id::text)) THEN
  RAISE EXCEPTION 'Account files must be removed first';
 END IF;
 UPDATE public.conversations SET is_active=false WHERE OLD.id IN(user1_id,user2_id);
 DELETE FROM public.messages WHERE sender_id=OLD.id;
 DELETE FROM public.waves WHERE OLD.id IN(from_user_id,to_user_id);
 DELETE FROM public.matches WHERE OLD.id IN(user1_id,user2_id);
 DELETE FROM public.sparks WHERE OLD.id IN(from_user_id,to_user_id);
 DELETE FROM public.daily_random_matches WHERE OLD.id IN(user_id,matched_user_id);
 DELETE FROM public.profile_views WHERE OLD.id IN(viewer_id,viewed_profile_id);
 DELETE FROM public.push_subscriptions WHERE user_id=OLD.id;
 DELETE FROM public.notification_log WHERE user_id=OLD.id;
 DELETE FROM public.unread_counts WHERE user_id=OLD.id;
 DELETE FROM public.daily_chat_starts WHERE user_id=OLD.id;
 DELETE FROM public.boosts WHERE user_id=OLD.id;
 DELETE FROM public.subscriptions WHERE user_id=OLD.id;
 DELETE FROM public.payments WHERE user_id=OLD.id;
 DELETE FROM public.user_favorite_venues WHERE user_id=OLD.id;
 DELETE FROM private.photo_reviews WHERE user_id=OLD.id;
 DELETE FROM private.photo_review_usage WHERE user_id=OLD.id;
 -- Profiles, check-ins, message requests, roles and verification requests have auth FKs.
 -- Restricted reports, bans, warnings and admin audit history are deliberately retained.
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.purge_departing_account() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER purge_departing_account BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION private.purge_departing_account();
COMMIT;
