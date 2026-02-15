
-- Create a function to check if a match exists between two users (any cafe)
CREATE OR REPLACE FUNCTION public.has_match_between(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE (user1_id = user_a AND user2_id = user_b)
       OR (user1_id = user_b AND user2_id = user_a)
  );
$$;

-- Drop existing INSERT policy on conversations
DROP POLICY IF EXISTS "Users can create conversations they participate in" ON public.conversations;

-- Create new INSERT policy that requires a match
CREATE POLICY "Users can create conversations only with matches"
ON public.conversations
FOR INSERT
WITH CHECK (
  ((auth.uid() = user1_id) OR (auth.uid() = user2_id))
  AND has_match_between(user1_id, user2_id)
);
