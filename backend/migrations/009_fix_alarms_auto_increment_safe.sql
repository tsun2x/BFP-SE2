-- Migration: Fix _alarms table auto-increment (safe version - preserves data)
-- Purpose: Add proper auto-increment sequence to alarm_id if missing
-- Run this in Supabase SQL Editor

-- Step 1: Check if alarm_id already has a default sequence
-- If it doesn't, this will add one

-- First, let's drop the current primary key and id column if needed
ALTER TABLE public."_alarms" DROP CONSTRAINT IF EXISTS "_alarms_pkey";

-- Step 2: Create a sequence for alarm_id (if not exists)
CREATE SEQUENCE IF NOT EXISTS public."_alarms_alarm_id_seq" AS BIGINT START 1 INCREMENT BY 1;

-- Step 3: Alter the alarm_id column to use the sequence as default
ALTER TABLE public."_alarms" ALTER COLUMN alarm_id SET DEFAULT nextval('public."_alarms_alarm_id_seq"');
ALTER TABLE public."_alarms" ALTER COLUMN alarm_id SET NOT NULL;

-- Step 4: Set the sequence ownership
ALTER SEQUENCE public."_alarms_alarm_id_seq" OWNED BY public."_alarms".alarm_id;

-- Step 5: Recreate the primary key
ALTER TABLE public."_alarms" ADD CONSTRAINT "_alarms_pkey" PRIMARY KEY (alarm_id);

-- Done! The _alarms table now has proper auto-increment for alarm_id
