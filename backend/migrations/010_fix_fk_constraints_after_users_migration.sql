-- ============================================================================
-- Migration: Fix FK constraints after _users to users migration
-- Date: February 10, 2026
-- Purpose: Update all FK constraints that still reference _users_backup
--          to point to the main public.users table instead
-- ============================================================================

BEGIN;

-- 1. Fix _alarms table FK constraint
ALTER TABLE public._alarms
  DROP CONSTRAINT IF EXISTS _alarms_end_user_id_fkey;

ALTER TABLE public._alarms
  ADD CONSTRAINT _alarms_end_user_id_fkey
  FOREIGN KEY (end_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;

-- 2. Fix _alarm_response_log table FK constraint
ALTER TABLE public._alarm_response_log
  DROP CONSTRAINT IF EXISTS _alarm_response_log_performed_by_user_id_fkey;

ALTER TABLE public._alarm_response_log
  ADD CONSTRAINT _alarm_response_log_performed_by_user_id_fkey
  FOREIGN KEY (performed_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;

-- 3. Verify constraints
SELECT con.conname, conrelid::regclass AS table_name, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
WHERE conname IN ('_alarms_end_user_id_fkey', '_alarm_response_log_performed_by_user_id_fkey');

COMMIT;
