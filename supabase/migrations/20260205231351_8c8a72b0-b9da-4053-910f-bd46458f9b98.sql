-- Create waves table for tracking wave interactions
CREATE TABLE public.waves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  cafe_id UUID NOT NULL REFERENCES public.cafes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id, cafe_id)
);

-- Create matches table for mutual waves
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  cafe_id UUID NOT NULL REFERENCES public.cafes(id),
  conversation_id UUID REFERENCES public.conversations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id, cafe_id)
);

-- Enable RLS on waves
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;

-- RLS policies for waves
CREATE POLICY "Users can create waves from themselves"
ON public.waves FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view waves they sent or received"
ON public.waves FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own waves"
ON public.waves FOR DELETE
USING (auth.uid() = from_user_id);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for matches
CREATE POLICY "Users can view matches they're part of"
ON public.matches FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches they're part of"
ON public.matches FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enable realtime for waves and matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.waves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- Function to check if users have a mutual wave (match)
CREATE OR REPLACE FUNCTION public.check_mutual_wave(user_a UUID, user_b UUID, target_cafe_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waves w1
    JOIN public.waves w2 ON w1.from_user_id = w2.to_user_id 
      AND w1.to_user_id = w2.from_user_id
      AND w1.cafe_id = w2.cafe_id
    WHERE w1.from_user_id = user_a
    AND w1.to_user_id = user_b
    AND w1.cafe_id = target_cafe_id
  );
$$;

-- Function to check if match already exists
CREATE OR REPLACE FUNCTION public.match_exists(user_a UUID, user_b UUID, target_cafe_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE cafe_id = target_cafe_id
    AND (
      (user1_id = user_a AND user2_id = user_b)
      OR (user1_id = user_b AND user2_id = user_a)
    )
  );
$$;