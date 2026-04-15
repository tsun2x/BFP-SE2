-- Migration 011: Add profile_picture_url column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

COMMENT ON COLUMN public.users.profile_picture_url IS 'Base64 encoded profile photo for BFP staff';
