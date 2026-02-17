-- Add category column to cafes table
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'cafe';

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_cafes_category ON public.cafes(category);

-- Add index for geospatial queries (lat/lng bounding box)
CREATE INDEX IF NOT EXISTS idx_cafes_lat_lng ON public.cafes(latitude, longitude);
