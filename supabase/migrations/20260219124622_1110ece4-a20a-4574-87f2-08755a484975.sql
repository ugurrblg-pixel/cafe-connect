
-- Add coffee_preference and social_energy columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coffee_preference text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS social_energy text DEFAULT NULL;

-- Create user_favorite_venues table
CREATE TABLE public.user_favorite_venues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  venue_id uuid NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, venue_id)
);

-- Enable RLS
ALTER TABLE public.user_favorite_venues ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own favorite venues"
ON public.user_favorite_venues FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite venues"
ON public.user_favorite_venues FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite venues"
ON public.user_favorite_venues FOR DELETE
USING (auth.uid() = user_id);

-- Authenticated users can view others' favorites (for matching)
CREATE POLICY "Authenticated users can view favorite venues"
ON public.user_favorite_venues FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_user_favorite_venues_user_id ON public.user_favorite_venues(user_id);
CREATE INDEX idx_user_favorite_venues_venue_id ON public.user_favorite_venues(venue_id);
