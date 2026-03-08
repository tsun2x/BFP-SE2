# Fix: Database Error - Cannot Save Incidents

## Problem
When creating incidents, you get this error:
```
Error: Failed to create incident
POST http://localhost:5000/api/create-incident 500 (Internal Server Error)
```

Backend error:
```
null value in column "alarm_id" of relation "_alarms" violates not-null constraint
```

## Root Cause
The `_alarms` table in Supabase doesn't have `alarm_id` set up as an auto-incrementing column.

## Solution - Fix the Supabase Table

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Create a **New Query**
5. Copy and paste **ONE** of the migration scripts below:

### Option A: Safe Fix (Preserves Existing Data) ⭐ RECOMMENDED
Use this if you have existing data in the `_alarms` table:

```sql
-- Step 1: Drop old primary key if exists
ALTER TABLE public."_alarms" DROP CONSTRAINT IF EXISTS "_alarms_pkey";

-- Step 2: Create sequence for auto-increment
CREATE SEQUENCE IF NOT EXISTS public."_alarms_alarm_id_seq" AS BIGINT START 1 INCREMENT BY 1;

-- Step 3: Set default value from sequence
ALTER TABLE public."_alarms" ALTER COLUMN alarm_id SET DEFAULT nextval('public."_alarms_alarm_id_seq"');
ALTER TABLE public."_alarms" ALTER COLUMN alarm_id SET NOT NULL;

-- Step 4: Set sequence ownership
ALTER SEQUENCE public."_alarms_alarm_id_seq" OWNED BY public."_alarms".alarm_id;

-- Step 5: Recreate primary key
ALTER TABLE public."_alarms" ADD CONSTRAINT "_alarms_pkey" PRIMARY KEY (alarm_id);
```

### Option B: Clean Slate (Deletes Table & Recreates)
Use this if the `_alarms` table is new and has no important data:

```sql
-- Drop the old table
DROP TABLE IF EXISTS public."_alarms" CASCADE;

-- Create new _alarms table with proper auto-increment
CREATE TABLE public."_alarms" (
  alarm_id BIGSERIAL PRIMARY KEY,
  end_user_id BIGINT REFERENCES public."users"("user_id") ON DELETE SET NULL,
  user_latitude DECIMAL(10, 8) NOT NULL,
  user_longitude DECIMAL(11, 8) NOT NULL,
  initial_alarm_level VARCHAR(50) NOT NULL,
  current_alarm_level VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Dispatch',
  assigned_station_id BIGINT,
  assigned_truck_id BIGINT,
  call_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dispatch_time TIMESTAMP WITH TIME ZONE,
  resolve_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."_alarms" ENABLE ROW LEVEL SECURITY;

-- Create open RLS policies (for testing)
CREATE POLICY "allow_all_select" ON public."_alarms" FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public."_alarms" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public."_alarms" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete" ON public."_alarms" FOR DELETE USING (true);
```

6. Click **Run** button
7. Wait for success message
8. Return to your app and try creating an incident again

## After The Fix
The backend should now be able to:
- ✅ Create incidents successfully
- ✅ Auto-assign `alarm_id` to each new incident
- ✅ Save incident data to the database

## If It Still Doesn't Work
1. Check that you ran the migration in the **correct** Supabase project
2. Verify your Supabase credentials in `backend/.env`:
   - `SUPABASE_URL` should match your project
   - `SUPABASE_KEY` should be correct
3. Restart the backend server: Stop `node server.js` and run it again
4. Try creating an incident again

## Files Created
- `backend/migrations/009_fix_alarms_auto_increment_safe.sql` (Option A)
- `backend/migrations/009_fix_alarms_table_auto_increment.sql` (Option B)
