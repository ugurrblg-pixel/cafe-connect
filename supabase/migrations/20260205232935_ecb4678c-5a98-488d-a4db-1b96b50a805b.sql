-- Update RLS policy on matches to allow updating conversation_id
CREATE POLICY "Users can update their matches" 
ON public.matches 
FOR UPDATE 
USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
WITH CHECK ((auth.uid() = user1_id) OR (auth.uid() = user2_id));

-- Fix existing matches without conversation_id by creating conversations for them
-- This is a one-time fix for existing data