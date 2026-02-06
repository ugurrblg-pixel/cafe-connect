-- Add google_place_id column to cafes table for caching Google Places results
ALTER TABLE public.cafes 
ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cafes_google_place_id ON public.cafes(google_place_id);

-- Add last_synced_at to track when cafe was last updated from Google
ALTER TABLE public.cafes 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now();