-- Add hobbies column to profiles table
-- Stores an array of hobby strings (max 5 hobbies enforced in application)
ALTER TABLE public.profiles 
ADD COLUMN hobbies TEXT[] DEFAULT '{}'::TEXT[];