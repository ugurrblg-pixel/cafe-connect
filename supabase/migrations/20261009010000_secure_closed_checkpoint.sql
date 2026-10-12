-- Security corrections while client access remains revoked.
-- No GRANT statements: a separate reviewed activation is required.
BEGIN;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can update their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own chat starts" ON public.daily_chat_starts;
DROP POLICY IF EXISTS "Users can update their own chat starts" ON public.daily_chat_starts;
-- Matching requires a server-authorized flow; forged client matches are disabled.
DROP POLICY IF EXISTS "Users can create matches they're part of" ON public.matches;
DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert their own random matches" ON public.daily_random_matches;

CREATE OR REPLACE FUNCTION public.protect_profile_managed_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $function$
BEGIN
  IF auth.role() IN ('anon','authenticated') THEN
    IF TG_OP='INSERT' THEN
      IF NEW.is_verified OR NEW.verification_status <> 'none'
         OR NEW.photo_moderation_status <> 'pending'
         OR NEW.boosted_until IS NOT NULL THEN
        RAISE EXCEPTION 'Managed profile fields require server authorization' USING ERRCODE='42501';
      END IF;
    ELSE
      IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id
         OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
         OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.photo_moderation_status IS DISTINCT FROM OLD.photo_moderation_status
         OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until THEN
        RAISE EXCEPTION 'Managed profile fields require server authorization' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER protect_profile_managed_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_managed_fields();

CREATE OR REPLACE FUNCTION public.protect_message_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $function$
BEGIN
  IF auth.role() IN ('anon','authenticated') THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'Message identity fields are immutable' USING ERRCODE='42501';
    END IF;
    IF NEW.content IS DISTINCT FROM OLD.content AND auth.uid() IS DISTINCT FROM OLD.sender_id THEN
      RAISE EXCEPTION 'Only the sender can edit message content' USING ERRCODE='42501';
    END IF;
    IF NEW.read_at IS DISTINCT FROM OLD.read_at AND auth.uid()=OLD.sender_id THEN
      RAISE EXCEPTION 'Only the recipient can mark a message read' USING ERRCODE='42501';
    END IF;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND auth.uid() IS DISTINCT FROM OLD.sender_id THEN
      RAISE EXCEPTION 'Only the sender can remove a message for both participants' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER protect_message_fields BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_message_fields();

CREATE OR REPLACE FUNCTION public.protect_conversation_members()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $function$
BEGIN
  IF auth.role() IN ('anon','authenticated') AND (
    NEW.id IS DISTINCT FROM OLD.id OR NEW.user1_id IS DISTINCT FROM OLD.user1_id
    OR NEW.user2_id IS DISTINCT FROM OLD.user2_id OR NEW.cafe_id IS DISTINCT FROM OLD.cafe_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Conversation membership is immutable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER protect_conversation_members BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.protect_conversation_members();

REVOKE ALL ON FUNCTION public.protect_profile_managed_fields() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.protect_message_fields() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.protect_conversation_members() FROM PUBLIC,anon,authenticated;
-- Keep every table inaccessible through the application's public key.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated;
COMMIT;
SELECT 'hardened_locked' AS security_status;
