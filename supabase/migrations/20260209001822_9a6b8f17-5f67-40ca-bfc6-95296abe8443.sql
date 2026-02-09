-- Add photo_urls array column for multiple profile photos
ALTER TABLE public.profiles ADD COLUMN photo_urls TEXT[] DEFAULT '{}'::TEXT[];