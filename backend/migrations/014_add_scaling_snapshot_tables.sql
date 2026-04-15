BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep fire_stations compatible with existing readiness update code.
ALTER TABLE public.fire_stations
  ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMPTZ DEFAULT NOW();

-- Repair station_readiness auto-increment so the API no longer has to guess the next ID.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'S'
      AND relname = 'station_readiness_readiness_id_seq'
  ) THEN
    CREATE SEQUENCE public.station_readiness_readiness_id_seq;
  END IF;
END $$;

ALTER SEQUENCE public.station_readiness_readiness_id_seq
  OWNED BY public.station_readiness.readiness_id;

ALTER TABLE public.station_readiness
  ALTER COLUMN readiness_id SET DEFAULT nextval('public.station_readiness_readiness_id_seq');

DO $$
DECLARE
  max_id BIGINT;
BEGIN
  SELECT COALESCE(MAX(readiness_id), 0) INTO max_id
  FROM public.station_readiness;

  PERFORM setval(
    'public.station_readiness_readiness_id_seq',
    GREATEST(max_id, 1),
    max_id > 0
  );
END $$;

-- Match the real alarm query patterns used by dispatch and duplicate detection.
CREATE INDEX IF NOT EXISTS idx_alarms_status_call_time
  ON public.alarms(status, call_time DESC);

CREATE INDEX IF NOT EXISTS idx_alarms_station_status_call_time
  ON public.alarms(assigned_station_id, status, call_time DESC);

CREATE INDEX IF NOT EXISTS idx_alarms_active_duplicate_lookup
  ON public.alarms(status, call_time DESC, user_latitude, user_longitude)
  WHERE status IN ('Pending Dispatch', 'Dispatched', 'On Scene', 'Under Control');

-- Live one-row-per-station snapshot for dispatch reads.
CREATE TABLE IF NOT EXISTS public.station_current_status (
  station_id BIGINT PRIMARY KEY REFERENCES public.fire_stations(station_id) ON DELETE CASCADE,
  readiness_status VARCHAR(50) NOT NULL DEFAULT 'NOT_READY'
    CHECK (readiness_status IN ('READY', 'PARTIALLY_READY', 'NOT_READY')),
  readiness_percentage INT NOT NULL DEFAULT 0
    CHECK (readiness_percentage BETWEEN 0 AND 100),
  equipment_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  active_incident_count INT NOT NULL DEFAULT 0 CHECK (active_incident_count >= 0),
  last_readiness_submission_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_current_status_dispatch
  ON public.station_current_status(is_online, readiness_status, updated_at DESC);

INSERT INTO public.station_current_status (
  station_id,
  readiness_status,
  readiness_percentage,
  equipment_checklist,
  last_readiness_submission_at,
  updated_at
)
SELECT
  fs.station_id,
  COALESCE(sr.status, 'NOT_READY') AS readiness_status,
  COALESCE(sr.readiness_percentage, 0) AS readiness_percentage,
  COALESCE(sr.equipment_checklist, '{}'::jsonb) AS equipment_checklist,
  sr.submitted_at,
  COALESCE(sr.submitted_at, NOW())
FROM public.fire_stations fs
LEFT JOIN LATERAL (
  SELECT
    status,
    readiness_percentage,
    equipment_checklist,
    submitted_at
  FROM public.station_readiness
  WHERE station_id = fs.station_id
  ORDER BY submitted_at DESC
  LIMIT 1
) sr ON TRUE
ON CONFLICT (station_id) DO UPDATE SET
  readiness_status = EXCLUDED.readiness_status,
  readiness_percentage = EXCLUDED.readiness_percentage,
  equipment_checklist = EXCLUDED.equipment_checklist,
  last_readiness_submission_at = EXCLUDED.last_readiness_submission_at,
  updated_at = EXCLUDED.updated_at;

UPDATE public.fire_stations fs
SET
  is_ready = (scs.readiness_status IN ('READY', 'PARTIALLY_READY')),
  last_status_update = COALESCE(scs.last_readiness_submission_at, fs.last_status_update, NOW())
FROM public.station_current_status scs
WHERE scs.station_id = fs.station_id;

CREATE OR REPLACE FUNCTION public.sync_station_current_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.station_current_status (
    station_id,
    readiness_status,
    readiness_percentage,
    equipment_checklist,
    last_readiness_submission_at,
    updated_at
  )
  VALUES (
    NEW.station_id,
    NEW.status,
    COALESCE(NEW.readiness_percentage, 0),
    COALESCE(NEW.equipment_checklist, '{}'::jsonb),
    NEW.submitted_at,
    NOW()
  )
  ON CONFLICT (station_id) DO UPDATE SET
    readiness_status = EXCLUDED.readiness_status,
    readiness_percentage = EXCLUDED.readiness_percentage,
    equipment_checklist = EXCLUDED.equipment_checklist,
    last_readiness_submission_at = EXCLUDED.last_readiness_submission_at,
    updated_at = NOW();

  UPDATE public.fire_stations
  SET
    is_ready = (NEW.status IN ('READY', 'PARTIALLY_READY')),
    last_status_update = COALESCE(NEW.submitted_at, NOW())
  WHERE station_id = NEW.station_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_station_current_status ON public.station_readiness;

CREATE TRIGGER trg_sync_station_current_status
AFTER INSERT OR UPDATE ON public.station_readiness
FOR EACH ROW
EXECUTE FUNCTION public.sync_station_current_status();

-- Live one-row-per-truck snapshot for map and dispatch screens.
CREATE TABLE IF NOT EXISTS public.firetruck_current_location (
  truck_id BIGINT PRIMARY KEY REFERENCES public.firetrucks(truck_id) ON DELETE CASCADE,
  station_id BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  alarm_id BIGINT REFERENCES public.alarms(alarm_id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2),
  heading DECIMAL(6, 2),
  accuracy DECIMAL(5, 2),
  fire_status TEXT,
  alarm_level TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firetruck_current_location_station
  ON public.firetruck_current_location(station_id);

CREATE INDEX IF NOT EXISTS idx_firetruck_current_location_alarm
  ON public.firetruck_current_location(alarm_id);

CREATE INDEX IF NOT EXISTS idx_firetruck_current_location_recorded_at
  ON public.firetruck_current_location(recorded_at DESC);

INSERT INTO public.firetruck_current_location (
  truck_id,
  station_id,
  alarm_id,
  latitude,
  longitude,
  speed,
  heading,
  accuracy,
  fire_status,
  alarm_level,
  recorded_at,
  updated_at
)
SELECT
  latest.truck_id,
  ft.assigned_station_id,
  latest.alarm_id,
  latest.latitude,
  latest.longitude,
  latest.speed,
  latest.heading,
  latest.accuracy,
  fts.fire_status,
  fts.alarm_level,
  latest.recorded_at,
  NOW()
FROM (
  SELECT DISTINCT ON (truck_id)
    truck_id,
    alarm_id,
    latitude,
    longitude,
    speed,
    heading,
    accuracy,
    recorded_at
  FROM public.firetruck_location_history
  ORDER BY truck_id, recorded_at DESC
) latest
JOIN public.firetrucks ft
  ON ft.truck_id = latest.truck_id
LEFT JOIN public.firetruck_status fts
  ON fts.truck_id = latest.truck_id
ON CONFLICT (truck_id) DO UPDATE SET
  station_id = EXCLUDED.station_id,
  alarm_id = EXCLUDED.alarm_id,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  speed = EXCLUDED.speed,
  heading = EXCLUDED.heading,
  accuracy = EXCLUDED.accuracy,
  fire_status = EXCLUDED.fire_status,
  alarm_level = EXCLUDED.alarm_level,
  recorded_at = EXCLUDED.recorded_at,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.sync_firetruck_current_location_from_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  truck_station_id BIGINT;
  truck_fire_status TEXT;
  truck_alarm_level TEXT;
BEGIN
  SELECT assigned_station_id
  INTO truck_station_id
  FROM public.firetrucks
  WHERE truck_id = NEW.truck_id;

  SELECT fire_status, alarm_level
  INTO truck_fire_status, truck_alarm_level
  FROM public.firetruck_status
  WHERE truck_id = NEW.truck_id
  ORDER BY updated_at DESC NULLS LAST, id DESC
  LIMIT 1;

  INSERT INTO public.firetruck_current_location (
    truck_id,
    station_id,
    alarm_id,
    latitude,
    longitude,
    speed,
    heading,
    accuracy,
    fire_status,
    alarm_level,
    recorded_at,
    updated_at
  )
  VALUES (
    NEW.truck_id,
    truck_station_id,
    NEW.alarm_id,
    NEW.latitude,
    NEW.longitude,
    NEW.speed,
    NEW.heading,
    NEW.accuracy,
    truck_fire_status,
    truck_alarm_level,
    COALESCE(NEW.recorded_at, NOW()),
    NOW()
  )
  ON CONFLICT (truck_id) DO UPDATE SET
    station_id = EXCLUDED.station_id,
    alarm_id = COALESCE(EXCLUDED.alarm_id, public.firetruck_current_location.alarm_id),
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    speed = EXCLUDED.speed,
    heading = EXCLUDED.heading,
    accuracy = EXCLUDED.accuracy,
    fire_status = COALESCE(EXCLUDED.fire_status, public.firetruck_current_location.fire_status),
    alarm_level = COALESCE(EXCLUDED.alarm_level, public.firetruck_current_location.alarm_level),
    recorded_at = EXCLUDED.recorded_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_firetruck_current_location_from_history ON public.firetruck_location_history;

CREATE TRIGGER trg_sync_firetruck_current_location_from_history
AFTER INSERT ON public.firetruck_location_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_firetruck_current_location_from_history();

CREATE OR REPLACE FUNCTION public.sync_firetruck_current_location_from_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.firetruck_current_location
  SET
    alarm_id = COALESCE(NEW.alarm_id, firetruck_current_location.alarm_id),
    fire_status = NEW.fire_status,
    alarm_level = NEW.alarm_level,
    updated_at = NOW()
  WHERE truck_id = NEW.truck_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_firetruck_current_location_from_status ON public.firetruck_status;

CREATE TRIGGER trg_sync_firetruck_current_location_from_status
AFTER INSERT OR UPDATE ON public.firetruck_status
FOR EACH ROW
EXECUTE FUNCTION public.sync_firetruck_current_location_from_status();

-- Refresh-token / session metadata for stable login flows.
CREATE TABLE IF NOT EXISTS public.user_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_session_id UUID REFERENCES public.user_sessions(session_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON public.user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON public.user_sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;

COMMIT;