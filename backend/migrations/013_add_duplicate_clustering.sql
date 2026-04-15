-- Migration 013: Add parent_alarm_id for duplicate incident clustering
-- When a new alarm is detected near an existing active alarm, it links to the parent

ALTER TABLE alarms ADD COLUMN IF NOT EXISTS parent_alarm_id BIGINT REFERENCES alarms(alarm_id) ON DELETE SET NULL;

-- Index for fast lookups of child alarms
CREATE INDEX IF NOT EXISTS idx_alarms_parent_alarm ON alarms(parent_alarm_id) WHERE parent_alarm_id IS NOT NULL;

COMMENT ON COLUMN alarms.parent_alarm_id IS 'References the original alarm if this is a duplicate/nearby report of the same incident';
