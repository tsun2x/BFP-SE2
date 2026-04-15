CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.otp_verifications (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  channel TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'account_verification',
  code_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_lookup
  ON public.otp_verifications(target, channel, purpose, consumed_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at
  ON public.otp_verifications(expires_at);
