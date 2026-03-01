
-- Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN gender text DEFAULT NULL;

-- Create daily_random_matches table to track usage
CREATE TABLE public.daily_random_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  matched_user_id uuid NOT NULL,
  match_date date NOT NULL DEFAULT CURRENT_DATE,
  conversation_id uuid REFERENCES public.conversations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_date)
);

-- Enable RLS
ALTER TABLE public.daily_random_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own random matches"
ON public.daily_random_matches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own random matches"
ON public.daily_random_matches FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_random_matches;
