-- Create reports table for storing user reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Update waves RLS to respect blocks (bidirectional)
DROP POLICY IF EXISTS "Users can view waves they sent or received" ON public.waves;
CREATE POLICY "Users can view waves they sent or received excluding blocks"
  ON public.waves FOR SELECT
  USING (
    ((auth.uid() = from_user_id) OR (auth.uid() = to_user_id))
    AND NOT is_blocked(auth.uid(), from_user_id)
    AND NOT is_blocked(auth.uid(), to_user_id)
    AND NOT is_blocked(from_user_id, auth.uid())
    AND NOT is_blocked(to_user_id, auth.uid())
  );

-- Block wave creation to/from blocked users
DROP POLICY IF EXISTS "Users can create waves from themselves" ON public.waves;
CREATE POLICY "Users can create waves excluding blocks"
  ON public.waves FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND NOT is_blocked(auth.uid(), to_user_id)
    AND NOT is_blocked(to_user_id, auth.uid())
  );

-- Update matches RLS to respect blocks
DROP POLICY IF EXISTS "Users can view matches they're part of" ON public.matches;
CREATE POLICY "Users can view matches excluding blocks"
  ON public.matches FOR SELECT
  USING (
    ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
    AND NOT is_blocked(auth.uid(), user1_id)
    AND NOT is_blocked(auth.uid(), user2_id)
    AND NOT is_blocked(user1_id, auth.uid())
    AND NOT is_blocked(user2_id, auth.uid())
  );

-- Update conversations RLS to respect blocks and is_active
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view active conversations excluding blocks"
  ON public.conversations FOR SELECT
  USING (
    ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
    AND is_active = true
    AND NOT is_blocked(auth.uid(), user1_id)
    AND NOT is_blocked(auth.uid(), user2_id)
    AND NOT is_blocked(user1_id, auth.uid())
    AND NOT is_blocked(user2_id, auth.uid())
  );

-- Update messages RLS to also check if conversation is accessible
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in accessible conversations"
  ON public.messages FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.is_active = true
      AND NOT is_blocked(auth.uid(), c.user1_id)
      AND NOT is_blocked(auth.uid(), c.user2_id)
      AND NOT is_blocked(c.user1_id, auth.uid())
      AND NOT is_blocked(c.user2_id, auth.uid())
    )
  );

-- Block message sending to blocked users
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages excluding blocks"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_participant(conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND c.is_active = true
      AND NOT is_blocked(auth.uid(), c.user1_id)
      AND NOT is_blocked(auth.uid(), c.user2_id)
      AND NOT is_blocked(c.user1_id, auth.uid())
      AND NOT is_blocked(c.user2_id, auth.uid())
    )
  );