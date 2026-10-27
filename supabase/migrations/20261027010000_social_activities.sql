BEGIN;
-- All access is caller-bound RPC. No public table access or profile-photo projection.
CREATE TABLE private.social_activity_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false);
INSERT INTO private.social_activity_settings(id) VALUES(true);
CREATE TABLE private.social_activities (
 id uuid PRIMARY KEY, host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 5 AND 80), description text NOT NULL CHECK(length(description) BETWEEN 10 AND 1000),
 category text NOT NULL CHECK(category IN ('coffee','games','walk')),
 venue_name text NOT NULL CHECK(length(venue_name) BETWEEN 3 AND 120),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -85 AND 85), longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '8 hours'),
 capacity integer NOT NULL CHECK(capacity BETWEEN 2 AND 20), cancelled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX social_activities_upcoming ON private.social_activities(starts_at) WHERE NOT cancelled;
CREATE TABLE private.social_activity_members (
 activity_id uuid NOT NULL REFERENCES private.social_activities(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('pending','accepted','declined','left')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(activity_id,user_id)
);
CREATE TABLE private.social_activity_messages (
 id uuid PRIMARY KEY, activity_id uuid NOT NULL REFERENCES private.social_activities(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, content text NOT NULL CHECK(length(content) BETWEEN 1 AND 1000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX social_activity_messages_time ON private.social_activity_messages(activity_id,created_at);
ALTER TABLE private.social_activity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.social_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.social_activity_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.social_activity_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.social_activity_settings,private.social_activities,private.social_activity_members,private.social_activity_messages FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.social_activity_eligible(who uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT who IS NOT NULL AND NOT public.is_user_banned(who) AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=who AND is_visible);
$$;
CREATE FUNCTION private.social_activity_blocked(a uuid,b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a));
$$;
CREATE FUNCTION public.social_activities_available() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce((SELECT enabled FROM private.social_activity_settings WHERE id),false) AND private.social_activity_eligible(auth.uid());
$$;
CREATE FUNCTION private.social_activity_visible(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT public.social_activities_available() AND EXISTS(SELECT 1 FROM private.social_activities a WHERE a.id=target
 AND NOT a.cancelled AND a.ends_at>now() AND private.social_activity_eligible(a.host_id) AND NOT private.social_activity_blocked(auth.uid(),a.host_id));
$$;
CREATE FUNCTION private.social_activity_chat_allowed(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT private.social_activity_visible(target) AND EXISTS(SELECT 1 FROM private.social_activities a WHERE a.id=target
 AND (a.host_id=auth.uid() OR EXISTS(SELECT 1 FROM private.social_activity_members m WHERE m.activity_id=target AND m.user_id=auth.uid() AND m.status='accepted')));
$$;
REVOKE ALL ON FUNCTION private.social_activity_eligible(uuid),private.social_activity_blocked(uuid,uuid),private.social_activity_visible(uuid),private.social_activity_chat_allowed(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.list_social_activities(target uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.social_activities_available() THEN RAISE EXCEPTION 'Activities unavailable' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(x.record ORDER BY x.starts_at,x.id),'[]'::jsonb) INTO result FROM (
 SELECT a.id,a.starts_at,jsonb_build_object('id',a.id,'title',a.title,'description',a.description,'category',a.category,'venue_name',a.venue_name,
 'latitude',a.latitude,'longitude',a.longitude,'starts_at',a.starts_at,'ends_at',a.ends_at,'capacity',a.capacity,
 'host_name',coalesce(nullif(p.display_name,''),nullif(p.name,''),'Riyo kullanıcısı'),'is_host',a.host_id=auth.uid(),
 'attending',1+(SELECT count(*) FROM private.social_activity_members m WHERE m.activity_id=a.id AND m.status='accepted'),
 'my_status',CASE WHEN a.host_id=auth.uid() THEN 'host' ELSE (SELECT status FROM private.social_activity_members WHERE activity_id=a.id AND user_id=auth.uid()) END) AS record
 FROM private.social_activities a JOIN public.profiles p ON p.user_id=a.host_id
 WHERE (target IS NULL OR a.id=target) AND private.social_activity_visible(a.id) AND a.starts_at<now()+interval '31 days' ORDER BY a.starts_at,a.id LIMIT 100
 ) x;
 RETURN result;
END $$;

CREATE FUNCTION public.create_social_activity(payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); target uuid; start_time timestamptz; end_time timestamptz;
BEGIN
 IF NOT public.social_activities_available() THEN RAISE EXCEPTION 'Activities unavailable' USING ERRCODE='42501'; END IF;
 target:=(payload->>'id')::uuid; start_time:=(payload->>'starts_at')::timestamptz; end_time:=(payload->>'ends_at')::timestamptz;
 IF target IS NULL THEN RAISE EXCEPTION 'Invalid activity id'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,27012026));
 IF EXISTS(SELECT 1 FROM private.social_activities WHERE id=target AND host_id=caller) THEN RETURN target; END IF;
 IF start_time IS NULL OR end_time IS NULL OR start_time<=now() OR start_time>now()+interval '30 days' THEN RAISE EXCEPTION 'Invalid activity time'; END IF;
 IF (SELECT count(*) FROM private.social_activities WHERE host_id=caller AND created_at>now()-interval '24 hours')>=3 THEN RAISE EXCEPTION 'Daily activity limit reached'; END IF;
 INSERT INTO private.social_activities(id,host_id,title,description,category,venue_name,latitude,longitude,starts_at,ends_at,capacity)
 VALUES(target,caller,btrim(payload->>'title'),btrim(payload->>'description'),payload->>'category',btrim(payload->>'venue_name'),
 (payload->>'latitude')::double precision,(payload->>'longitude')::double precision,start_time,end_time,(payload->>'capacity')::integer);
 RETURN target;
END $$;

CREATE FUNCTION public.manage_social_activity(target uuid,action text,member uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); a private.social_activities; state text;
BEGIN
 IF NOT public.social_activities_available() THEN RAISE EXCEPTION 'Activities unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM private.social_activities WHERE id=target FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Activity unavailable'; END IF;
 IF action='cancel' AND a.host_id=caller THEN UPDATE private.social_activities SET cancelled=true WHERE id=target; RETURN true; END IF;
 -- A user may always withdraw their own membership, including after a host blocks them.
 IF action='withdraw' AND caller<>a.host_id THEN
 UPDATE private.social_activity_members SET status='left',updated_at=now() WHERE activity_id=target AND user_id=caller; RETURN true; END IF;
 IF NOT private.social_activity_visible(target) THEN RAISE EXCEPTION 'Activity unavailable' USING ERRCODE='42501'; END IF;
 IF action='request' THEN
  IF caller=a.host_id THEN RAISE EXCEPTION 'Already hosting'; END IF;
  SELECT status INTO state FROM private.social_activity_members WHERE activity_id=target AND user_id=caller;
  IF state IN ('pending','accepted') THEN RETURN true; END IF;
  IF state='declined' THEN RAISE EXCEPTION 'Request declined'; END IF;
  IF (SELECT count(*) FROM private.social_activity_members WHERE activity_id=target AND status='accepted')+1>=a.capacity THEN RAISE EXCEPTION 'Activity full'; END IF;
  IF (SELECT count(*) FROM private.social_activity_members WHERE user_id=caller AND created_at>now()-interval '24 hours')>=20 THEN RAISE EXCEPTION 'Daily request limit reached'; END IF;
  INSERT INTO private.social_activity_members(activity_id,user_id,status) VALUES(target,caller,'pending')
   ON CONFLICT(activity_id,user_id) DO UPDATE SET status='pending',updated_at=now(); RETURN true;
 ELSIF action IN ('approve','decline','remove') AND caller=a.host_id AND member IS NOT NULL AND member<>caller THEN
  SELECT status INTO state FROM private.social_activity_members WHERE activity_id=target AND user_id=member;
  IF state IS NULL THEN RAISE EXCEPTION 'Request unavailable'; END IF;
  IF action='approve' AND state='accepted' THEN RETURN true; END IF;
  IF action IN ('approve','decline') AND state<>'pending' THEN RAISE EXCEPTION 'Request changed'; END IF;
  IF action='approve' THEN
   IF NOT private.social_activity_eligible(member) OR private.social_activity_blocked(caller,member) THEN RAISE EXCEPTION 'Member unavailable' USING ERRCODE='42501'; END IF;
   IF (SELECT count(*) FROM private.social_activity_members WHERE activity_id=target AND status='accepted')+1>=a.capacity THEN RAISE EXCEPTION 'Activity full'; END IF;
  END IF;
  UPDATE private.social_activity_members SET status=CASE WHEN action='approve' THEN 'accepted' ELSE 'declined' END,updated_at=now() WHERE activity_id=target AND user_id=member; RETURN true;
 END IF;
 RAISE EXCEPTION 'Operation not allowed' USING ERRCODE='42501';
END $$;

CREATE FUNCTION public.get_social_activity_members(target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE host uuid; result jsonb;
BEGIN
 IF NOT private.social_activity_chat_allowed(target) THEN RAISE EXCEPTION 'Members unavailable' USING ERRCODE='42501'; END IF;
 SELECT host_id INTO host FROM private.social_activities WHERE id=target;
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',CASE WHEN host=auth.uid() THEN m.user_id ELSE NULL END,
 'name',CASE WHEN private.social_activity_eligible(m.user_id) AND NOT private.social_activity_blocked(host,m.user_id) THEN coalesce(nullif(p.display_name,''),nullif(p.name,''),'Riyo kullanıcısı') ELSE 'Kullanılamayan hesap' END,'status',m.status) ORDER BY m.created_at),'[]'::jsonb) INTO result
 FROM private.social_activity_members m JOIN public.profiles p ON p.user_id=m.user_id
 WHERE m.activity_id=target AND m.status IN ('pending','accepted') AND (host=auth.uid() OR (m.status='accepted'
 AND private.social_activity_eligible(m.user_id) AND NOT private.social_activity_blocked(auth.uid(),m.user_id) AND NOT private.social_activity_blocked(host,m.user_id)));
 RETURN result;
END $$;

CREATE FUNCTION public.read_social_activity_chat(target uuid,before_time timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF NOT private.social_activity_chat_allowed(target) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(x.record ORDER BY x.created_at,x.id),'[]'::jsonb) INTO result FROM (
 SELECT m.id,m.created_at,jsonb_build_object('id',m.id,'content',m.content,'created_at',m.created_at,'is_own',m.sender_id=auth.uid(),
 'name',coalesce(nullif(p.display_name,''),nullif(p.name,''),'Riyo kullanıcısı')) AS record
 FROM private.social_activity_messages m JOIN public.profiles p ON p.user_id=m.sender_id
 WHERE m.activity_id=target AND (before_time IS NULL OR m.created_at<before_time) AND NOT private.social_activity_blocked(auth.uid(),m.sender_id)
 AND private.social_activity_eligible(m.sender_id) ORDER BY m.created_at DESC,m.id DESC LIMIT 50) x;
 RETURN result;
END $$;
CREATE FUNCTION public.send_social_activity_message(target uuid,request_id uuid,message text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); a private.social_activities;
BEGIN
 -- Same row lock as cancellation, approvals and withdrawals: no access-check/write race.
 SELECT * INTO a FROM private.social_activities WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT private.social_activity_chat_allowed(target) THEN RAISE EXCEPTION 'Chat unavailable' USING ERRCODE='42501'; END IF;
 IF request_id IS NULL OR message IS NULL OR length(btrim(message)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 IF EXISTS(SELECT 1 FROM private.social_activity_messages WHERE id=request_id AND activity_id=target AND sender_id=caller) THEN RETURN request_id; END IF;
 IF (SELECT count(*) FROM private.social_activity_messages WHERE sender_id=caller AND created_at>now()-interval '1 minute')>=10 THEN RAISE EXCEPTION 'Message limit reached'; END IF;
 INSERT INTO private.social_activity_messages(id,activity_id,sender_id,content) VALUES(request_id,target,caller,btrim(message)); RETURN request_id;
END $$;
CREATE FUNCTION public.report_social_activity(target uuid,report_reason text,details text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE caller uuid:=auth.uid(); host uuid; saved uuid;
BEGIN
 IF NOT private.social_activity_visible(target) OR report_reason NOT IN ('spam','harassment','inappropriate') OR details IS NULL OR length(btrim(details)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Invalid report' USING ERRCODE='42501'; END IF;
 SELECT host_id INTO host FROM private.social_activities WHERE id=target;
 IF host=caller THEN RAISE EXCEPTION 'Invalid report'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,391011));
 SELECT id INTO saved FROM public.reports WHERE reporter_id=caller AND status='pending' AND description LIKE ('[Aktivite '||target::text||']%') AND reason=report_reason LIMIT 1;
 IF saved IS NOT NULL THEN RETURN saved; END IF;
 IF (SELECT count(*) FROM public.reports WHERE reporter_id=caller AND created_at>now()-interval '24 hours')>=5 THEN RAISE EXCEPTION 'Daily report limit reached'; END IF;
 INSERT INTO public.reports(reporter_id,reported_user_id,reason,description) VALUES(caller,host,report_reason,'[Aktivite '||target::text||'] '||btrim(details)) RETURNING id INTO saved;
 RETURN saved;
END $$;
CREATE FUNCTION public.admin_social_activities(action text DEFAULT 'list',target uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'moderator')) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
 IF action='cancel' THEN
  PERFORM 1 FROM private.social_activities WHERE id=target FOR UPDATE;
  UPDATE private.social_activities SET cancelled=true WHERE id=target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Activity unavailable'; END IF;
 ELSIF action<>'list' THEN RAISE EXCEPTION 'Not allowed'; END IF;
 SELECT coalesce(jsonb_agg(x.record ORDER BY x.created_at DESC),'[]'::jsonb) INTO result FROM (
 SELECT a.created_at,jsonb_build_object('id',a.id,'title',a.title,'venue_name',a.venue_name,'starts_at',a.starts_at,'cancelled',a.cancelled,
 'host_name',coalesce(nullif(p.display_name,''),p.name)) AS record
 FROM private.social_activities a JOIN public.profiles p ON p.user_id=a.host_id ORDER BY a.created_at DESC LIMIT 100) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.social_activities_available(),public.list_social_activities(uuid),public.create_social_activity(jsonb),public.manage_social_activity(uuid,text,uuid),public.get_social_activity_members(uuid),public.read_social_activity_chat(uuid,timestamptz),public.send_social_activity_message(uuid,uuid,text),public.report_social_activity(uuid,text,text),public.admin_social_activities(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.social_activities_available(),public.list_social_activities(uuid),public.create_social_activity(jsonb),public.manage_social_activity(uuid,text,uuid),public.get_social_activity_members(uuid),public.read_social_activity_chat(uuid,timestamptz),public.send_social_activity_message(uuid,uuid,text),public.report_social_activity(uuid,text,text),public.admin_social_activities(text,uuid) TO authenticated;
-- Explicit activation is separate from installation and security verification.
COMMIT;
