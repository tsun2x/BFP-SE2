CREATE TABLE IF NOT EXISTS public.officer_dispatch_status (
  status_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
  station_id BIGINT NULL REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'dispatcher',
  dispatch_group TEXT NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  is_busy BOOLEAN NOT NULL DEFAULT FALSE,
  current_alarm_id BIGINT NULL REFERENCES public.alarms(alarm_id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officer_dispatch_group
  ON public.officer_dispatch_status(dispatch_group, is_online, is_busy, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_officer_dispatch_alarm
  ON public.officer_dispatch_status(current_alarm_id);

ALTER TABLE public.alarms
  ADD COLUMN IF NOT EXISTS assigned_officer_id BIGINT NULL REFERENCES public.users(user_id) ON DELETE SET NULL;