-- Add client_id column to messages table for reliable optimistic update matching
ALTER TABLE public.messages 
ADD COLUMN client_id text;

-- Create index for efficient client_id lookups
CREATE INDEX idx_messages_client_id ON public.messages(client_id) WHERE client_id IS NOT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.messages.client_id IS 'Client-generated UUID for matching optimistic updates with realtime messages';