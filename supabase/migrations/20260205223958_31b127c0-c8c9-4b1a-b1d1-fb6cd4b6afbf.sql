-- Add INSERT policy for conversations table
-- Only allow users to create conversations where they are a participant
CREATE POLICY "Users can create conversations they participate in"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Add message content length constraint
ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_length 
CHECK (length(content) > 0 AND length(content) <= 2000);