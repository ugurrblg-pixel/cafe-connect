
-- =============================================
-- DROP ALL EXISTING RLS POLICIES FIRST
-- =============================================

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- cafes
DROP POLICY IF EXISTS "Anyone can view cafes" ON public.cafes;

-- check_ins
DROP POLICY IF EXISTS "Users can view active check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Admins can view all check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can create their own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can update their own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can delete their own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Admins can delete check_ins" ON public.check_ins;

-- waves
DROP POLICY IF EXISTS "Users can view waves they sent or received excluding blocks" ON public.waves;
DROP POLICY IF EXISTS "Users can create waves excluding blocks" ON public.waves;
DROP POLICY IF EXISTS "Users can delete their own waves" ON public.waves;

-- conversations
DROP POLICY IF EXISTS "Users can view active conversations excluding blocks" ON public.conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;

-- matches
DROP POLICY IF EXISTS "Users can view matches excluding blocks" ON public.matches;
DROP POLICY IF EXISTS "Admins can view all matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create matches they're part of" ON public.matches;
DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;

-- messages
DROP POLICY IF EXISTS "Users can view messages in accessible conversations" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages excluding blocks" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can update messages" ON public.messages;

-- message_requests
DROP POLICY IF EXISTS "Users can view their own message requests" ON public.message_requests;
DROP POLICY IF EXISTS "Users can create message requests" ON public.message_requests;
DROP POLICY IF EXISTS "Recipients can update message requests" ON public.message_requests;

-- user_blocks
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.user_blocks;

-- reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- user_bans
DROP POLICY IF EXISTS "Admins can manage bans" ON public.user_bans;

-- user_warnings
DROP POLICY IF EXISTS "Admins can manage warnings" ON public.user_warnings;

-- subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;

-- boosts
DROP POLICY IF EXISTS "Users can view their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Admins can view all boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can insert their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can update their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Admins can update boosts" ON public.boosts;

-- payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;

-- profile_views
DROP POLICY IF EXISTS "Users can view who viewed their profile" ON public.profile_views;
DROP POLICY IF EXISTS "Users can log profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Users can update their views" ON public.profile_views;

-- daily_chat_starts
DROP POLICY IF EXISTS "Users can view their own chat starts" ON public.daily_chat_starts;
DROP POLICY IF EXISTS "Users can insert their own chat starts" ON public.daily_chat_starts;
DROP POLICY IF EXISTS "Users can update their own chat starts" ON public.daily_chat_starts;

-- unread_counts
DROP POLICY IF EXISTS "Users can view their own unread counts" ON public.unread_counts;
DROP POLICY IF EXISTS "Users can insert their own unread counts" ON public.unread_counts;
DROP POLICY IF EXISTS "Users can update their own unread counts" ON public.unread_counts;

-- push_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;

-- notification_log
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification_log;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notification_log;

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;

-- storage
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- =============================================
-- RECREATE ALL RLS POLICIES
-- =============================================

-- profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- cafes
CREATE POLICY "Anyone can view cafes" ON public.cafes FOR SELECT USING (true);

-- check_ins
CREATE POLICY "Users can view active check-ins" ON public.check_ins FOR SELECT USING (expiry_time > now());
CREATE POLICY "Admins can view all check_ins" ON public.check_ins FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can create their own check-ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own check-ins" ON public.check_ins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own check-ins" ON public.check_ins FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete check_ins" ON public.check_ins FOR DELETE USING (is_admin(auth.uid()));

-- waves
CREATE POLICY "Users can view waves they sent or received excluding blocks" ON public.waves FOR SELECT USING (
  ((auth.uid() = from_user_id) OR (auth.uid() = to_user_id))
  AND NOT is_blocked(auth.uid(), from_user_id) AND NOT is_blocked(auth.uid(), to_user_id)
  AND NOT is_blocked(from_user_id, auth.uid()) AND NOT is_blocked(to_user_id, auth.uid())
);
CREATE POLICY "Users can create waves excluding blocks" ON public.waves FOR INSERT WITH CHECK (
  auth.uid() = from_user_id AND NOT is_blocked(auth.uid(), to_user_id) AND NOT is_blocked(to_user_id, auth.uid())
);
CREATE POLICY "Users can delete their own waves" ON public.waves FOR DELETE USING (auth.uid() = from_user_id);

-- conversations
CREATE POLICY "Users can view active conversations excluding blocks" ON public.conversations FOR SELECT USING (
  ((auth.uid() = user1_id) OR (auth.uid() = user2_id)) AND is_active = true
  AND NOT is_blocked(auth.uid(), user1_id) AND NOT is_blocked(auth.uid(), user2_id)
  AND NOT is_blocked(user1_id, auth.uid()) AND NOT is_blocked(user2_id, auth.uid())
);
CREATE POLICY "Admins can view all conversations" ON public.conversations FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can create conversations they participate in" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));
CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));
CREATE POLICY "Admins can update conversations" ON public.conversations FOR UPDATE USING (is_admin(auth.uid()));

-- matches
CREATE POLICY "Users can view matches excluding blocks" ON public.matches FOR SELECT USING (
  ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
  AND NOT is_blocked(auth.uid(), user1_id) AND NOT is_blocked(auth.uid(), user2_id)
  AND NOT is_blocked(user1_id, auth.uid()) AND NOT is_blocked(user2_id, auth.uid())
);
CREATE POLICY "Admins can view all matches" ON public.matches FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can create matches they're part of" ON public.matches FOR INSERT WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));
CREATE POLICY "Users can update their matches" ON public.matches FOR UPDATE USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id)) WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));
CREATE POLICY "Admins can delete matches" ON public.matches FOR DELETE USING (is_admin(auth.uid()));

-- messages
CREATE POLICY "Users can view messages in accessible conversations" ON public.messages FOR SELECT USING (
  is_conversation_participant(conversation_id, auth.uid())
  AND (deleted_at IS NULL OR sender_id = auth.uid())
  AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.is_active = true
    AND NOT is_blocked(auth.uid(), c.user1_id) AND NOT is_blocked(auth.uid(), c.user2_id)
    AND NOT is_blocked(c.user1_id, auth.uid()) AND NOT is_blocked(c.user2_id, auth.uid()))
);
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can send messages excluding blocks" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND is_conversation_participant(conversation_id, auth.uid())
  AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.is_active = true
    AND NOT is_blocked(auth.uid(), c.user1_id) AND NOT is_blocked(auth.uid(), c.user2_id)
    AND NOT is_blocked(c.user1_id, auth.uid()) AND NOT is_blocked(c.user2_id, auth.uid()))
);
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Admins can update messages" ON public.messages FOR UPDATE USING (is_admin(auth.uid()));

-- message_requests
CREATE POLICY "Users can view their own message requests" ON public.message_requests FOR SELECT USING ((auth.uid() = from_user_id) OR (auth.uid() = to_user_id));
CREATE POLICY "Users can create message requests" ON public.message_requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Recipients can update message requests" ON public.message_requests FOR UPDATE USING (auth.uid() = to_user_id);

-- user_blocks
CREATE POLICY "Users can view their own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create blocks" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete their own blocks" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- reports
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (is_admin(auth.uid()));

-- user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (is_admin(auth.uid()));

-- user_bans
CREATE POLICY "Admins can manage bans" ON public.user_bans FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_warnings
CREATE POLICY "Admins can manage warnings" ON public.user_warnings FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update subscriptions" ON public.subscriptions FOR UPDATE USING (is_admin(auth.uid()));

-- boosts
CREATE POLICY "Users can view their own boosts" ON public.boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all boosts" ON public.boosts FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert their own boosts" ON public.boosts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own boosts" ON public.boosts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update boosts" ON public.boosts FOR UPDATE USING (is_admin(auth.uid()));

-- payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can insert payments" ON public.payments FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE USING (is_admin(auth.uid()));

-- profile_views
CREATE POLICY "Users can view who viewed their profile" ON public.profile_views FOR SELECT USING (auth.uid() = viewed_profile_id);
CREATE POLICY "Users can log profile views" ON public.profile_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Users can update their views" ON public.profile_views FOR UPDATE USING (auth.uid() = viewer_id);

-- daily_chat_starts
CREATE POLICY "Users can view their own chat starts" ON public.daily_chat_starts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat starts" ON public.daily_chat_starts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat starts" ON public.daily_chat_starts FOR UPDATE USING (auth.uid() = user_id);

-- unread_counts
CREATE POLICY "Users can view their own unread counts" ON public.unread_counts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own unread counts" ON public.unread_counts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own unread counts" ON public.unread_counts FOR UPDATE USING (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can read all subscriptions" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- notification_log
CREATE POLICY "Users can view their own notifications" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notification_log FOR UPDATE USING (auth.uid() = user_id);

-- admin_audit_log
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_log FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- STORAGE POLICIES
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- REALTIME (ignore errors if already added)
-- =============================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.unread_counts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
