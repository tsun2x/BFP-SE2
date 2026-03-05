-- Migration: Fix _alarms table auto-increment for alarm_id
-- Purpose: Ensure alarm_id is properly auto-incrementing (BIGSERIAL)
-- Run this in Supabase SQL Editor

-- Drop the old _alarms table and recreate with proper schema
DROP TABLE IF EXISTS public."_alarms" CASCADE;

-- Create _alarms table with proper auto-incrementing alarm_id
CREATE TABLE public."_alarms" (
  alarm_id BIGSERIAL PRIMARY KEY,
  end_user_id BIGINT REFERENCES public."users"("user_id") ON DELETE SET NULL,
  user_latitude DECIMAL(10, 8) NOT NULL,
  user_longitude DECIMAL(11, 8) NOT NULL,
  initial_alarm_level VARCHAR(50) NOT NULL,
  current_alarm_level VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Dispatch',
  assigned_station_id BIGINT REFERENCES public."_fire_stations"("station_id") ON DELETE SET NULL,
  assigned_truck_id BIGINT REFERENCES public."_firetrucks"("truck_id") ON DELETE SET NULL,
  call_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dispatch_time TIMESTAMP WITH TIME ZONE,
  resolve_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_status (status),
  INDEX idx_call_time (call_time),
  INDEX idx_end_user_id (end_user_id)
);

-- Enable RLS
ALTER TABLE public."_alarms" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for now)
CREATE POLICY "allow all select" ON public."_alarms" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."_alarms" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."_alarms" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."_alarms" FOR DELETE USING (true);
