
-- Add verification columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS verification_selfie_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz DEFAULT NULL;

-- verification_status: 'none' | 'pending' | 'approved' | 'rejected'

-- Add photo_moderation_status to profiles for AI photo moderation
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS photo_moderation_status text NOT NULL DEFAULT 'pending';

-- photo_moderation_status: 'pending' | 'approved' | 'rejected'
