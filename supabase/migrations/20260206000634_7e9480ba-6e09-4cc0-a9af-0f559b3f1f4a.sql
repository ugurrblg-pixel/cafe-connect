-- Add coordinates to cafes table for distance calculation
ALTER TABLE public.cafes 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add last_active_at to check_ins for activity tracking
ALTER TABLE public.check_ins 
ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add check-in location for audit (optional, stores where user was when checking in)
ALTER TABLE public.check_ins 
ADD COLUMN check_in_latitude DECIMAL(10, 8),
ADD COLUMN check_in_longitude DECIMAL(11, 8);

-- Create index for faster activity queries
CREATE INDEX idx_check_ins_last_active ON public.check_ins(last_active_at);

-- Update RLS to allow users to update their own check-in's last_active_at
CREATE POLICY "Users can update their own check-ins" 
ON public.check_ins 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add some sample coordinates to existing cafes (Istanbul coordinates)
UPDATE public.cafes SET 
  latitude = 41.0082 + (random() * 0.02 - 0.01),
  longitude = 28.9784 + (random() * 0.02 - 0.01)
WHERE latitude IS NULL;