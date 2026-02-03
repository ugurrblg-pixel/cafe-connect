-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  age INTEGER,
  bio TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  purpose TEXT NOT NULL DEFAULT 'friendship' CHECK (purpose IN ('chat', 'friendship', 'dating')),
  allow_dms BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cafes table
CREATE TABLE public.cafes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  distance TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  rating DECIMAL(2,1) DEFAULT 4.5,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create check_ins table
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '60 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_check_ins_cafe_id ON public.check_ins(cafe_id);
CREATE INDEX idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX idx_check_ins_expiry ON public.check_ins(expiry_time);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to view other profiles (for seeing who's at a cafe)
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Cafes policies (publicly viewable)
CREATE POLICY "Anyone can view cafes"
  ON public.cafes FOR SELECT
  USING (true);

-- Check-ins policies
CREATE POLICY "Users can create their own check-ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view active check-ins"
  ON public.check_ins FOR SELECT
  USING (expiry_time > now());

CREATE POLICY "Users can delete their own check-ins"
  ON public.check_ins FOR DELETE
  USING (auth.uid() = user_id);

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for check_ins to see live users
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;

-- Insert sample cafes
INSERT INTO public.cafes (name, address, distance, image_url, rating, is_open) VALUES
  ('The Cozy Bean', '123 Main Street', '0.2 km', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop', 4.8, true),
  ('Sunrise Café', '456 Oak Avenue', '0.5 km', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop', 4.5, true),
  ('Urban Grind', '789 Park Lane', '0.8 km', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop', 4.6, true),
  ('Brew & Bloom', '321 Garden Road', '1.2 km', 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop', 4.9, true),
  ('The Daily Dose', '555 River Street', '1.5 km', 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=400&h=300&fit=crop', 4.3, false);