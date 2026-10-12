-- Applied to xbodyzqtltrdtdahrteh after explicit approval, 10 October 2026.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS messages_sender_request_unique ON public.messages(sender_id,client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_sender_created_idx ON public.messages(sender_id,created_at);
CREATE OR REPLACE FUNCTION private.can_access_own_chat(target_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.conversations c
 JOIN public.profiles p1 ON p1.user_id=c.user1_id
 JOIN public.profiles p2 ON p2.user_id=c.user2_id
 WHERE c.id=target_conversation_id AND c.is_active AND auth.uid() IN(c.user1_id,c.user2_id)
 AND p1.is_visible AND p2.is_visible AND p1.allow_dms AND p2.allow_dms
 AND NOT public.is_user_banned(c.user1_id) AND NOT public.is_user_banned(c.user2_id)
 AND EXISTS(SELECT 1 FROM public.check_ins ci WHERE ci.user_id=c.user1_id AND ci.cafe_id=c.cafe_id AND ci.expiry_time>now())
 AND EXISTS(SELECT 1 FROM public.check_ins ci WHERE ci.user_id=c.user2_id AND ci.cafe_id=c.cafe_id AND ci.expiry_time>now())
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE
  (b.blocker_id=c.user1_id AND b.blocked_id=c.user2_id) OR (b.blocker_id=c.user2_id AND b.blocked_id=c.user1_id)));
$$;
REVOKE ALL ON FUNCTION private.can_access_own_chat(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.open_own_match_chat(target_match_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); mt public.matches; conv public.conversations; peer uuid;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT * INTO mt FROM public.matches WHERE id=target_match_id AND caller IN(user1_id,user2_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 peer:=CASE WHEN caller=mt.user1_id THEN mt.user2_id ELSE mt.user1_id END;
 PERFORM pg_advisory_xact_lock(hashtextextended(least(caller::text,peer::text)||':'||greatest(caller::text,peer::text),390701));
 IF NOT EXISTS(SELECT 1 FROM public.list_current_cafe_members(mt.cafe_id) m WHERE m.user_id=peer AND m.allow_dms)
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=caller AND allow_dms) THEN
  RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 IF mt.conversation_id IS NOT NULL THEN
  IF NOT private.can_access_own_chat(mt.conversation_id) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
  RETURN mt.conversation_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.waves WHERE from_user_id=caller AND to_user_id=peer AND cafe_id=mt.cafe_id AND created_at>=now()-interval '24 hours')
 OR NOT EXISTS(SELECT 1 FROM public.waves WHERE from_user_id=peer AND to_user_id=caller AND cafe_id=mt.cafe_id AND created_at>=now()-interval '24 hours') THEN
  RAISE EXCEPTION 'Mutual wave required' USING ERRCODE='42501'; END IF;
 SELECT * INTO conv FROM public.conversations WHERE user1_id=least(caller,peer) AND user2_id=greatest(caller,peer) AND cafe_id=mt.cafe_id;
 IF FOUND AND NOT conv.is_active THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 IF NOT FOUND THEN
  INSERT INTO public.conversations(user1_id,user2_id,cafe_id) VALUES(least(caller,peer),greatest(caller,peer),mt.cafe_id) RETURNING * INTO conv;
 END IF;
 UPDATE public.matches SET conversation_id=conv.id WHERE id=mt.id;
 RETURN conv.id;
END $$;

CREATE OR REPLACE FUNCTION public.get_own_chat(target_conversation_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c public.conversations; peer uuid; peer_name text; cafe_name text; rows jsonb;
BEGIN
 IF NOT private.can_access_own_chat(target_conversation_id) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.conversations WHERE id=target_conversation_id;
 peer:=CASE WHEN auth.uid()=c.user1_id THEN c.user2_id ELSE c.user1_id END;
 SELECT display_name INTO peer_name FROM public.profiles WHERE user_id=peer;
 SELECT name INTO cafe_name FROM public.cafes WHERE id=c.cafe_id;
 SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at,m.id),'[]'::jsonb) INTO rows FROM
 (SELECT id,sender_id,CASE WHEN deleted_at IS NULL THEN content ELSE '' END AS content,created_at,read_at,deleted_at,client_id
 FROM public.messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 100) m;
 RETURN jsonb_build_object('id',c.id,'cafe_id',c.cafe_id,'cafe_name',cafe_name,'peer_id',peer,'peer_name',peer_name,'messages',rows);
END $$;

CREATE OR REPLACE FUNCTION public.list_own_chat_inbox()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); rows jsonb;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.sort_time DESC,r.match_id),'[]'::jsonb) INTO rows FROM (
 SELECT mt.id AS match_id,mt.conversation_id,mt.cafe_id,mt.created_at AS matched_at,
 member.user_id AS peer_id,member.display_name AS peer_name,cafe.name AS cafe_name,
 msg.content AS last_content,msg.created_at AS last_created_at,msg.sender_id AS last_sender_id,
 (SELECT count(*) FROM public.messages m WHERE m.conversation_id=mt.conversation_id AND m.sender_id<>caller AND m.read_at IS NULL AND m.deleted_at IS NULL) AS unread_count,
 coalesce(msg.created_at,mt.created_at) AS sort_time
 FROM public.list_own_current_matches() mt
 CROSS JOIN LATERAL public.list_current_cafe_members(mt.cafe_id) member
 JOIN public.cafes cafe ON cafe.id=mt.cafe_id
 LEFT JOIN LATERAL (SELECT CASE WHEN m.deleted_at IS NULL THEN m.content ELSE 'Mesaj kaldırıldı' END AS content,m.created_at,m.sender_id
  FROM public.messages m WHERE m.conversation_id=mt.conversation_id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) msg ON true
 WHERE member.user_id=CASE WHEN mt.user1_id=caller THEN mt.user2_id ELSE mt.user1_id END
 AND member.allow_dms AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=caller AND allow_dms)
 AND (mt.conversation_id IS NULL OR private.can_access_own_chat(mt.conversation_id))
 ORDER BY coalesce(msg.created_at,mt.created_at) DESC,mt.id LIMIT 100) r;
 RETURN rows;
END $$;

CREATE OR REPLACE FUNCTION public.send_own_chat_message(target_conversation_id uuid,message_content text,request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); c public.conversations; saved public.messages; text_content text:=btrim(message_content); peer uuid;
BEGIN
 IF caller IS NULL OR NOT private.can_access_own_chat(target_conversation_id) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL OR text_content IS NULL OR text_content !~ '[^[:space:]]' OR char_length(text_content) NOT BETWEEN 1 AND 2000 THEN
  RAISE EXCEPTION 'Message must contain 1 to 2000 characters' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.conversations WHERE id=target_conversation_id;
 peer:=CASE WHEN caller=c.user1_id THEN c.user2_id ELSE c.user1_id END;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,390901));
 PERFORM pg_advisory_xact_lock(hashtextextended(least(caller::text,peer::text)||':'||greatest(caller::text,peer::text),390701));
 IF NOT private.can_access_own_chat(target_conversation_id) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO saved FROM public.messages WHERE sender_id=caller AND client_id=request_id::text;
 IF FOUND THEN
  IF saved.conversation_id<>target_conversation_id OR saved.content<>text_content THEN RAISE EXCEPTION 'Request already used' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('id',saved.id,'created_at',saved.created_at);
 END IF;
 IF (SELECT count(*) FROM public.messages WHERE sender_id=caller AND created_at>clock_timestamp()-interval '1 minute')>=20 THEN
  RAISE EXCEPTION 'Message rate limit reached' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.messages(conversation_id,sender_id,content,client_id) VALUES(target_conversation_id,caller,text_content,request_id::text) RETURNING * INTO saved;
 UPDATE public.conversations SET updated_at=clock_timestamp() WHERE id=target_conversation_id;
 RETURN jsonb_build_object('id',saved.id,'created_at',saved.created_at);
END $$;

CREATE OR REPLACE FUNCTION public.mark_own_chat_read(target_conversation_id uuid,message_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT private.can_access_own_chat(target_conversation_id) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 IF message_ids IS NULL OR cardinality(message_ids)>100 THEN RAISE EXCEPTION 'Invalid message list' USING ERRCODE='22023'; END IF;
 UPDATE public.messages SET read_at=clock_timestamp() WHERE conversation_id=target_conversation_id AND sender_id<>auth.uid() AND id=ANY(message_ids) AND read_at IS NULL;
END $$;
CREATE OR REPLACE FUNCTION public.remove_own_chat_message(target_conversation_id uuid,target_message_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE affected integer;
BEGIN
 IF NOT private.can_access_own_chat(target_conversation_id) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 UPDATE public.messages SET deleted_at=coalesce(deleted_at,clock_timestamp()) WHERE conversation_id=target_conversation_id AND id=target_message_id AND sender_id=auth.uid();
 GET DIAGNOSTICS affected=ROW_COUNT; RETURN affected=1;
END $$;
REVOKE ALL ON FUNCTION public.open_own_match_chat(uuid),public.get_own_chat(uuid),public.list_own_chat_inbox(),public.send_own_chat_message(uuid,text,uuid),public.mark_own_chat_read(uuid,uuid[]),public.remove_own_chat_message(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.open_own_match_chat(uuid),public.get_own_chat(uuid),public.list_own_chat_inbox(),public.send_own_chat_message(uuid,text,uuid),public.mark_own_chat_read(uuid,uuid[]),public.remove_own_chat_message(uuid,uuid) TO authenticated;
-- No direct table access and no public Realtime channels.
COMMIT;
