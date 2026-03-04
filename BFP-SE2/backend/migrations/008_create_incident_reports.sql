-- Migration: Create incident_reports table for Supabase
-- Purpose: Comprehensive incident documentation and reporting

CREATE TABLE IF NOT EXISTS incident_reports (
  report_id BIGSERIAL PRIMARY KEY,
  alarm_id BIGINT NOT NULL REFERENCES alarms(alarm_id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  incident_type VARCHAR(100),
  location VARCHAR(255) NOT NULL,
  narrative TEXT,
  submitted_by_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  property_affected VARCHAR(255),
  injuries_reported INT DEFAULT 0,
  deaths_reported INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_incident_reports_alarm_id ON incident_reports(alarm_id);
CREATE INDEX idx_incident_reports_incident_type ON incident_reports(incident_type);
CREATE INDEX idx_incident_reports_submitted_at ON incident_reports(submitted_at);
CREATE INDEX idx_incident_reports_submitted_by ON incident_reports(submitted_by_user_id);

-- Enable Row Level Security
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to view incident reports
CREATE POLICY "Allow authenticated users to view incident reports"
  ON incident_reports FOR SELECT
  USING (auth.jwt() ->> 'id' IS NOT NULL);

-- Allow authenticated users to insert incident reports
CREATE POLICY "Allow authenticated users to insert incident reports"
  ON incident_reports FOR INSERT
  WITH CHECK (auth.jwt() ->> 'id' IS NOT NULL);

-- Allow users to update their own reports
CREATE POLICY "Allow users to update their own incident reports"
  ON incident_reports FOR UPDATE
  USING ((auth.jwt() ->> 'id')::bigint = submitted_by_user_id OR (auth.jwt() ->> 'role') = 'admin');
