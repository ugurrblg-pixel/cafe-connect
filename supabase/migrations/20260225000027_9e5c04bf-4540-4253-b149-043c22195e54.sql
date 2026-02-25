-- Change default is_open from true to null so new venues show "Unknown" until verified
ALTER TABLE public.cafes ALTER COLUMN is_open SET DEFAULT null;

-- Reset any venues that have is_open=true but no opening_hours data 
-- (these are likely stale/incorrect defaults)
UPDATE public.cafes SET is_open = null WHERE is_open = true AND opening_hours IS NULL;