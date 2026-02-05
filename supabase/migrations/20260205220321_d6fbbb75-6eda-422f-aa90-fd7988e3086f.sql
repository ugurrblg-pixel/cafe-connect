-- Add display_name and is_visible fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Add constraint for bio length (max 120 chars) using a trigger
CREATE OR REPLACE FUNCTION public.validate_bio_length()
RETURNS TRIGGER AS $$
BEGIN
  IF length(NEW.bio) > 120 THEN
    RAISE EXCEPTION 'Bio must be 120 characters or less';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_bio_before_insert_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bio_length();

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatar uploads
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);