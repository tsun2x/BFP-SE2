-- Migration: Allow inserts into alarm_response_log (temporary permissive RLS)
-- Purpose: Create a Row Level Security policy to allow inserts into alarm_response_log
-- Run this in Supabase SQL Editor for the project

-- Ensure RLS is enabled (should already be)
ALTER TABLE public.alarm_response_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policy with the same name
DROP POLICY IF EXISTS "Allow server insert alarm_response_log" ON public.alarm_response_log;

-- Create a permissive policy for INSERTs (allow inserts from any role).
-- Note: For INSERT policies, PostgreSQL only accepts a WITH CHECK expression.
CREATE POLICY "Allow server insert alarm_response_log" ON public.alarm_response_log
  FOR INSERT WITH CHECK (true);

-- Note: This is permissive (allows inserts by any role). For production, tighten this to
-- require specific JWT claims or use the Supabase service_role key from the backend.
