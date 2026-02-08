-- Add soft delete field for message hiding
ALTER TABLE public.messages 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient filtering of non-deleted messages
CREATE INDEX idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NULL;

-- Update the RLS policy for viewing messages to exclude soft-deleted ones
DROP POLICY IF EXISTS "Users can view messages in accessible conversations" ON public.messages;

CREATE POLICY "Users can view messages in accessible conversations" 
ON public.messages 
FOR SELECT 
USING (
  is_conversation_participant(conversation_id, auth.uid()) 
  AND (deleted_at IS NULL OR sender_id = auth.uid())
  AND (EXISTS ( 
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND c.is_active = true 
    AND NOT is_blocked(auth.uid(), c.user1_id) 
    AND NOT is_blocked(auth.uid(), c.user2_id) 
    AND NOT is_blocked(c.user1_id, auth.uid()) 
    AND NOT is_blocked(c.user2_id, auth.uid())
  ))
);