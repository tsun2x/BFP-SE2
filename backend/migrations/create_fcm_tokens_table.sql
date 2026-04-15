-- FCM device tokens for push notifications (incoming call alerts)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_id TEXT NOT NULL DEFAULT 'default',
  fcm_token TEXT NOT NULL,
  twilio_identity TEXT,
  platform TEXT NOT NULL DEFAULT 'android',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Index for fast lookups by twilio_identity (used during incoming calls)
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_twilio_identity ON fcm_tokens(twilio_identity);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- Enable RLS but allow service role full access
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON fcm_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
