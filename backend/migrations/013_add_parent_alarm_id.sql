-- Migration 013: Add parent_alarm_id column for duplicate incident clustering
-- This supports the duplicate detection feature that links near-duplicate alarms
-- to their parent alarm (within 0.5km and 10 minutes).

ALTER TABLE alarms
  ADD COLUMN IF NOT EXISTS parent_alarm_id BIGINT
    REFERENCES alarms(alarm_id) ON DELETE SET NULL;

-- Index for quick lookup of duplicates by parent
CREATE INDEX IF NOT EXISTS idx_alarms_parent_alarm_id
  ON alarms(parent_alarm_id)
  WHERE parent_alarm_id IS NOT NULL;
