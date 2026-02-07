-- Add opening_hours column to cafes table for OSM opening hours data
ALTER TABLE public.cafes 
ADD COLUMN IF NOT EXISTS opening_hours TEXT;