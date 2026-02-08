-- Add notifications_enabled column to profiles for smart notification preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.notifications_enabled IS 'User preference for receiving push notifications';