-- Fix the banned check trigger for messages table
-- The messages table uses sender_id, not user_id
CREATE OR REPLACE FUNCTION public.check_message_sender_not_banned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_user_banned(NEW.sender_id) THEN
    RAISE EXCEPTION 'User is banned and cannot perform this action';
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop the old trigger that uses the wrong function
DROP TRIGGER IF EXISTS prevent_banned_messaging ON public.messages;

-- Create new trigger with the correct function
CREATE TRIGGER prevent_banned_messaging
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_sender_not_banned();