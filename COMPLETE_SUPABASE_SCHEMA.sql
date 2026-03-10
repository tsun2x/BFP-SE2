-- ============================================================================
-- BFP EMERGENCY SYSTEM - New Supabase Schema with OTP Authentication
-- ============================================================================
-- HOW AUTH WORKS IN THIS SCHEMA:
--   - All users are registered in Supabase Auth (auth.users) first
--   - public.users links to auth.users via auth_id (UUID)
--   - Web Admin / SubAdmin   → sign in with EMAIL OTP (Supabase Magic Link / OTP)
--   - Driver / End User      → sign in with PHONE OTP (Supabase SMS OTP)
--   - NO MORE custom password column — Supabase Auth handles credentials
--   - RLS policies use auth.uid() to enforce access control
--
-- SUPABASE DASHBOARD SETTINGS REQUIRED (do these BEFORE running this SQL):
--   1. Authentication → Providers → Enable "Phone" provider (Twilio or MessageBird)
--   2. Authentication → Providers → Enable "Email" provider (already on by default)
--   3. Authentication → Settings → Disable "Confirm email" if you want email OTP only
--   4. Storage → Create buckets:
--        - "news-images"          (public)
--        - "safety-tip-images"   (public)
--        - "message-attachments" (private)
--        - "profile-photos"      (private)
--
-- RUN ORDER: Paste this entire file into Supabase SQL Editor and Run All at once.
-- ============================================================================


-- ============================================================================
-- STEP 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search


-- ============================================================================
-- STEP 2: USERS TABLE
-- Links to Supabase Auth (auth.users) via auth_id
-- NO password column — Supabase Auth owns credentials
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  user_id       BIGSERIAL PRIMARY KEY,
  auth_id       UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  -- auth_id is NULL until the user is created in Supabase Auth
  -- For BFP staff (admin/substation_admin/driver): auth.users uses EMAIL
  -- For end_user (civilians): auth.users uses PHONE NUMBER

  id_number     VARCHAR(20)  UNIQUE,          -- BFP badge ID (e.g. BFP-00001), NULL for end_user
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  middle_name   VARCHAR(100),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(150) UNIQUE,          -- required for admin / substation_admin
  phone_number  VARCHAR(50)  UNIQUE,          -- required for driver / end_user
  role          VARCHAR(50)  NOT NULL DEFAULT 'end_user',
  rank          VARCHAR(100),
  substation    VARCHAR(100),
  assigned_station_id BIGINT,                 -- FK added after fire_stations is created

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('admin', 'substation_admin', 'driver', 'end_user', 'super_admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id            ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_id_number          ON public.users(id_number);
CREATE INDEX IF NOT EXISTS idx_users_phone_number       ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email              ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role               ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_assigned_station   ON public.users(assigned_station_id);

COMMENT ON TABLE  public.users IS 'BFP user profiles — linked to Supabase Auth via auth_id';
COMMENT ON COLUMN public.users.auth_id IS 'UUID from auth.users — set after OTP sign-up/sign-in';
COMMENT ON COLUMN public.users.id_number IS 'BFP badge number (e.g. BFP-00001). NULL for civilian end_users';
COMMENT ON COLUMN public.users.role IS 'admin=HQ, substation_admin=Branch, driver=Firetruck operator, end_user=Civilian caller';


-- ============================================================================
-- STEP 3: FIRE STATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fire_stations (
  station_id      BIGSERIAL PRIMARY KEY,
  station_name    VARCHAR(255) NOT NULL,
  station_type    VARCHAR(50)  NOT NULL DEFAULT 'Substation',
  latitude        DECIMAL(10, 8) NOT NULL,
  longitude       DECIMAL(11, 8) NOT NULL,
  contact_number  VARCHAR(20),
  address         VARCHAR(255),
  head_officer    VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_station_type CHECK (station_type IN ('Main', 'Substation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_main_station
  ON public.fire_stations(station_type) WHERE station_type = 'Main';

CREATE INDEX IF NOT EXISTS idx_fire_stations_location
  ON public.fire_stations(latitude, longitude);

COMMENT ON TABLE  public.fire_stations IS 'Fire station locations — one Main, multiple Substations';
COMMENT ON COLUMN public.fire_stations.station_type IS 'Main = Central HQ; Substation = Branch';


-- ============================================================================
-- STEP 4: ADD FK FROM users TO fire_stations
-- ============================================================================
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_assigned_station
  FOREIGN KEY (assigned_station_id)
  REFERENCES public.fire_stations(station_id)
  ON DELETE SET NULL;


-- ============================================================================
-- STEP 5: FIRETRUCKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.firetrucks (
  truck_id              BIGSERIAL PRIMARY KEY,
  truck_code            VARCHAR(50)  UNIQUE NOT NULL,
  truck_name            VARCHAR(100),
  assigned_station_id   BIGINT NOT NULL REFERENCES public.fire_stations(station_id) ON DELETE RESTRICT,
  truck_type            VARCHAR(50),
  capacity              INT,
  current_latitude      DECIMAL(10, 8),
  current_longitude     DECIMAL(11, 8),
  is_active             BOOLEAN    DEFAULT TRUE,
  last_location_update  TIMESTAMPTZ,
  driver_id             BIGINT     REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firetrucks_station   ON public.firetrucks(assigned_station_id);
CREATE INDEX IF NOT EXISTS idx_firetrucks_driver    ON public.firetrucks(driver_id);
CREATE INDEX IF NOT EXISTS idx_firetrucks_active    ON public.firetrucks(is_active);

COMMENT ON TABLE public.firetrucks IS 'Fleet inventory with real-time GPS tracking';


-- ============================================================================
-- STEP 6: ALARMS (Emergency Incidents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alarms (
  alarm_id             BIGSERIAL PRIMARY KEY,
  end_user_id          BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  user_latitude        DECIMAL(10, 8) NOT NULL,
  user_longitude       DECIMAL(11, 8) NOT NULL,
  initial_alarm_level  VARCHAR(50) NOT NULL,
  current_alarm_level  VARCHAR(50) NOT NULL,
  status               VARCHAR(50) NOT NULL DEFAULT 'Pending Dispatch',
  assigned_station_id  BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  assigned_truck_id    BIGINT REFERENCES public.firetrucks(truck_id) ON DELETE SET NULL,
  call_time            TIMESTAMPTZ DEFAULT NOW(),
  dispatch_time        TIMESTAMPTZ,
  resolve_time         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_alarm_status CHECK (status IN (
    'Pending Dispatch', 'Dispatched', 'On Scene',
    'Under Control', 'Resolved', 'Cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS idx_alarms_status      ON public.alarms(status);
CREATE INDEX IF NOT EXISTS idx_alarms_call_time   ON public.alarms(call_time DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_end_user    ON public.alarms(end_user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_station     ON public.alarms(assigned_station_id);
CREATE INDEX IF NOT EXISTS idx_alarms_truck       ON public.alarms(assigned_truck_id);
CREATE INDEX IF NOT EXISTS idx_alarms_location    ON public.alarms(user_latitude, user_longitude);

COMMENT ON TABLE public.alarms IS 'Core emergency incident records — all emergency calls from end users';


-- ============================================================================
-- STEP 7: ALARM RESPONSE LOG (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alarm_response_log (
  log_id              BIGSERIAL PRIMARY KEY,
  alarm_id            BIGINT NOT NULL REFERENCES public.alarms(alarm_id) ON DELETE CASCADE,
  action_type         VARCHAR(100) NOT NULL,
  details             TEXT,
  performed_by_user_id BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  action_timestamp    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alarm_log_alarm_id  ON public.alarm_response_log(alarm_id);
CREATE INDEX IF NOT EXISTS idx_alarm_log_timestamp ON public.alarm_response_log(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alarm_log_user      ON public.alarm_response_log(performed_by_user_id);

COMMENT ON TABLE public.alarm_response_log IS 'Full audit trail — every action on an incident is logged here';


-- ============================================================================
-- STEP 8: INCIDENT REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.incident_reports (
  report_id           BIGSERIAL PRIMARY KEY,
  alarm_id            BIGINT NOT NULL REFERENCES public.alarms(alarm_id) ON DELETE CASCADE,
  report_type         VARCHAR(50) NOT NULL,
  incident_type       VARCHAR(100),
  location            VARCHAR(255) NOT NULL,
  narrative           TEXT,
  submitted_by_user_id BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  submitted_at        TIMESTAMPTZ DEFAULT NOW(),
  property_affected   VARCHAR(255),
  injuries_reported   INT DEFAULT 0,
  deaths_reported     INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_alarm     ON public.incident_reports(alarm_id);
CREATE INDEX IF NOT EXISTS idx_incident_type      ON public.incident_reports(incident_type);
CREATE INDEX IF NOT EXISTS idx_incident_submitted ON public.incident_reports(submitted_at DESC);

COMMENT ON TABLE public.incident_reports IS 'Comprehensive post-incident documentation and reporting';


-- ============================================================================
-- STEP 9: STATION READINESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.station_readiness (
  readiness_id          BIGSERIAL PRIMARY KEY,
  station_id            BIGINT NOT NULL REFERENCES public.fire_stations(station_id) ON DELETE CASCADE,
  submitted_by_user_id  BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  status                VARCHAR(50) NOT NULL DEFAULT 'NOT_READY',
  readiness_percentage  INT DEFAULT 0,
  equipment_checklist   JSONB,
  -- example: {"firetruck":true,"scba":true,"hoses":true,"radio":true,
  --            "water":true,"crew":true,"oic":true,"driver":true,"generator":true}
  notes                 TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_readiness_status CHECK (status IN ('READY', 'PARTIALLY_READY', 'NOT_READY')),
  CONSTRAINT valid_percentage CHECK (readiness_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_readiness_station ON public.station_readiness(station_id);
CREATE INDEX IF NOT EXISTS idx_readiness_status  ON public.station_readiness(status);
CREATE INDEX IF NOT EXISTS idx_readiness_time    ON public.station_readiness(submitted_at DESC);

COMMENT ON TABLE public.station_readiness IS 'Daily equipment & personnel readiness checklist per station';


-- ============================================================================
-- STEP 10: OFFICER LOGIN HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.officer_login_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  station_id  BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  login_time  TIMESTAMPTZ DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  status      VARCHAR(50) DEFAULT 'Online'
);

CREATE INDEX IF NOT EXISTS idx_login_history_user      ON public.officer_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_station   ON public.officer_login_history(station_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time      ON public.officer_login_history(login_time DESC);

COMMENT ON TABLE public.officer_login_history IS 'Tracks when officers log in and out of the system';


-- ============================================================================
-- STEP 11: FIRETRUCK STATUS (Real-time dispatch status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.firetruck_status (
  id          BIGSERIAL PRIMARY KEY,
  truck_id    BIGINT NOT NULL REFERENCES public.firetrucks(truck_id) ON DELETE CASCADE,
  alarm_id    BIGINT REFERENCES public.alarms(alarm_id) ON DELETE SET NULL,
  alarm_level TEXT,
  fire_status TEXT,
  latitude    FLOAT,
  longitude   FLOAT,
  driver_name TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firetruck_status_truck  ON public.firetruck_status(truck_id);
CREATE INDEX IF NOT EXISTS idx_firetruck_status_alarm  ON public.firetruck_status(alarm_id);

COMMENT ON TABLE public.firetruck_status IS 'Real-time status of each firetruck during an active alarm dispatch';


-- ============================================================================
-- STEP 12: FIRETRUCK LOCATION HISTORY (GPS Archive)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.firetruck_location_history (
  location_id BIGSERIAL PRIMARY KEY,
  truck_id    BIGINT NOT NULL REFERENCES public.firetrucks(truck_id) ON DELETE CASCADE,
  alarm_id    BIGINT REFERENCES public.alarms(alarm_id) ON DELETE SET NULL,
  latitude    DECIMAL(10, 8) NOT NULL,
  longitude   DECIMAL(11, 8) NOT NULL,
  speed       DECIMAL(5, 2),
  heading     DECIMAL(6, 2),
  accuracy    DECIMAL(5, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_history_truck  ON public.firetruck_location_history(truck_id);
CREATE INDEX IF NOT EXISTS idx_loc_history_alarm  ON public.firetruck_location_history(alarm_id);
CREATE INDEX IF NOT EXISTS idx_loc_history_time   ON public.firetruck_location_history(recorded_at DESC);

COMMENT ON TABLE public.firetruck_location_history IS 'GPS breadcrumb archive for route history and analytics';


-- ============================================================================
-- STEP 13: CONVERSATIONS (Inter-station messaging threads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  conversation_id BIGSERIAL PRIMARY KEY,
  station_a_id    BIGINT NOT NULL REFERENCES public.fire_stations(station_id) ON DELETE CASCADE,
  station_b_id    BIGINT NOT NULL REFERENCES public.fire_stations(station_id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT different_stations CHECK (station_a_id <> station_b_id)
);

-- Prevent duplicate conversation pairs regardless of order (a→b same as b→a)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_conversation
  ON public.conversations (LEAST(station_a_id, station_b_id), GREATEST(station_a_id, station_b_id));

CREATE INDEX IF NOT EXISTS idx_conv_station_a ON public.conversations(station_a_id);
CREATE INDEX IF NOT EXISTS idx_conv_station_b ON public.conversations(station_b_id);

COMMENT ON TABLE public.conversations IS 'Messaging threads between two fire stations';


-- ============================================================================
-- STEP 14: MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  message_id           BIGSERIAL PRIMARY KEY,
  conversation_id      BIGINT NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  sender_station_id    BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  recipient_station_id BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  sender_user_id       BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  subject              VARCHAR(255),
  body                 TEXT,
  sent_at              TIMESTAMPTZ DEFAULT NOW(),
  is_read              BOOLEAN DEFAULT FALSE,
  deleted_by_sender    BOOLEAN DEFAULT FALSE,
  deleted_by_recipient BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender       ON public.messages(sender_station_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient    ON public.messages(recipient_station_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at      ON public.messages(sent_at DESC);

COMMENT ON TABLE public.messages IS 'Individual messages in a station-to-station conversation';


-- ============================================================================
-- STEP 15: MESSAGE ATTACHMENTS
-- Files stored in Supabase Storage bucket: "message-attachments"
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  attachment_id  BIGSERIAL PRIMARY KEY,
  message_id     BIGINT NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,     -- Supabase Storage public URL
  file_name      VARCHAR(255),
  mime_type      VARCHAR(100),
  file_size_bytes BIGINT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON public.message_attachments(message_id);

COMMENT ON TABLE public.message_attachments IS 'File attachments for messages — stored in Supabase Storage bucket "message-attachments"';


-- ============================================================================
-- STEP 16: EMERGENCY CONTACTS (Public hotlines directory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id         BIGSERIAL PRIMARY KEY,
  category   TEXT NOT NULL,
  station    TEXT,
  hotline    TEXT NOT NULL,
  location   TEXT,
  published  BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_category ON public.emergency_contacts(category);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_order    ON public.emergency_contacts(sort_order);

COMMENT ON TABLE public.emergency_contacts IS 'Directory of emergency hotlines shown to end users';


-- ============================================================================
-- STEP 17: SAFETY TIP CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.safety_tip_categories (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  color      VARCHAR(50),
  image_url  TEXT,        -- Supabase Storage URL in "safety-tip-images" bucket
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.safety_tip_categories IS 'Categories for grouping safety tips (e.g. Fire Prevention, Evacuation)';


-- ============================================================================
-- STEP 18: SAFETY TIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.safety_tips (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  section     VARCHAR(255),
  task        TEXT,
  description TEXT,
  image_url   TEXT,        -- Supabase Storage URL in "safety-tip-images" bucket
  category_id BIGINT REFERENCES public.safety_tip_categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_tips_category ON public.safety_tips(category_id);
CREATE INDEX IF NOT EXISTS idx_safety_tips_user     ON public.safety_tips(user_id);

COMMENT ON TABLE public.safety_tips IS 'Fire safety tips visible to end users in the mobile app';


-- ============================================================================
-- STEP 19: NEWS ROOM (Announcements / News articles)
-- Images stored in Supabase Storage bucket: "news-images"
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.news_room (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT REFERENCES public.users(user_id) ON DELETE SET NULL,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  heading_image     TEXT,        -- Supabase Storage URL in "news-images" bucket
  additional_images JSONB,       -- array of image URLs
  published         BOOLEAN DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  date              TIMESTAMPTZ,
  slug              VARCHAR(500) UNIQUE,
  metadata          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  author            TEXT
);

CREATE INDEX IF NOT EXISTS idx_news_published    ON public.news_room(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_slug         ON public.news_room(slug);
CREATE INDEX IF NOT EXISTS idx_news_user         ON public.news_room(user_id);

COMMENT ON TABLE public.news_room IS 'News and announcements published by BFP — shown to all users';


-- ============================================================================
-- STEP 20: HELPER FUNCTION — auto-update updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'fire_stations', 'firetrucks', 'alarms',
    'incident_reports', 'station_readiness', 'conversations',
    'messages', 'emergency_contacts', 'safety_tip_categories',
    'safety_tips', 'news_room'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    ', t, t);
  END LOOP;
END;
$$;


-- ============================================================================
-- STEP 21: HELPER FUNCTION — auto-create public.users row after Supabase Auth signup
-- When a user signs up via OTP, this trigger auto-inserts a profile row
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if no matching row exists yet
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_id = NEW.id) THEN
    INSERT INTO public.users (
      auth_id,
      email,
      phone_number,
      first_name,
      last_name,
      full_name,
      role
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.phone,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
      COALESCE(NEW.raw_user_meta_data->>'last_name',  'User'),
      COALESCE(NEW.raw_user_meta_data->>'full_name',  'Unknown User'),
      COALESCE(NEW.raw_user_meta_data->>'role',       'end_user')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users insert (fires after every OTP sign-up)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================================
-- STEP 22: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================
ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fire_stations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firetrucks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_response_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_readiness        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_login_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firetruck_status         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firetruck_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_tip_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_tips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_room                ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 23: RLS POLICIES
-- Strategy:
--   - Public read for news, safety tips, emergency contacts (anyone can view)
--   - Authenticated users can read their own data
--   - Admins (admin/super_admin) can do everything
--   - Backend uses service_role key (bypasses RLS entirely — most secure)
-- ============================================================================

-- ---- USERS ----
-- Anyone authenticated can read users (needed for dispatch/messaging features)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can update only their own profile
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Only backend (service_role) can insert/delete users
-- No INSERT/DELETE policy = blocked for anon/authenticated clients
-- Backend uses service_role key which bypasses RLS


-- ---- FIRE STATIONS ----
-- Everyone can read (end users see station info)
DROP POLICY IF EXISTS "fire_stations_select" ON public.fire_stations;
CREATE POLICY "fire_stations_select" ON public.fire_stations
  FOR SELECT USING (true);

-- Only authenticated staff (admin/substation_admin) can insert/update/delete
DROP POLICY IF EXISTS "fire_stations_write" ON public.fire_stations;
CREATE POLICY "fire_stations_write" ON public.fire_stations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );


-- ---- FIRETRUCKS ----
DROP POLICY IF EXISTS "firetrucks_select" ON public.firetrucks;
CREATE POLICY "firetrucks_select" ON public.firetrucks
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "firetrucks_write" ON public.firetrucks;
CREATE POLICY "firetrucks_write" ON public.firetrucks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );


-- ---- ALARMS ----
DROP POLICY IF EXISTS "alarms_select" ON public.alarms;
CREATE POLICY "alarms_select" ON public.alarms
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "alarms_insert" ON public.alarms;
CREATE POLICY "alarms_insert" ON public.alarms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "alarms_update" ON public.alarms;
CREATE POLICY "alarms_update" ON public.alarms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );


-- ---- ALARM RESPONSE LOG ----
DROP POLICY IF EXISTS "alarm_log_select" ON public.alarm_response_log;
CREATE POLICY "alarm_log_select" ON public.alarm_response_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "alarm_log_insert" ON public.alarm_response_log;
CREATE POLICY "alarm_log_insert" ON public.alarm_response_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ---- INCIDENT REPORTS ----
DROP POLICY IF EXISTS "incident_reports_select" ON public.incident_reports;
CREATE POLICY "incident_reports_select" ON public.incident_reports
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "incident_reports_insert" ON public.incident_reports;
CREATE POLICY "incident_reports_insert" ON public.incident_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "incident_reports_update" ON public.incident_reports;
CREATE POLICY "incident_reports_update" ON public.incident_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );


-- ---- STATION READINESS ----
DROP POLICY IF EXISTS "readiness_select" ON public.station_readiness;
CREATE POLICY "readiness_select" ON public.station_readiness
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "readiness_insert" ON public.station_readiness;
CREATE POLICY "readiness_insert" ON public.station_readiness
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );


-- ---- OFFICER LOGIN HISTORY ----
DROP POLICY IF EXISTS "login_history_select" ON public.officer_login_history;
CREATE POLICY "login_history_select" ON public.officer_login_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );

DROP POLICY IF EXISTS "login_history_insert" ON public.officer_login_history;
CREATE POLICY "login_history_insert" ON public.officer_login_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ---- FIRETRUCK STATUS ----
DROP POLICY IF EXISTS "firetruck_status_select" ON public.firetruck_status;
CREATE POLICY "firetruck_status_select" ON public.firetruck_status
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "firetruck_status_write" ON public.firetruck_status;
CREATE POLICY "firetruck_status_write" ON public.firetruck_status
  FOR ALL USING (auth.uid() IS NOT NULL);


-- ---- FIRETRUCK LOCATION HISTORY ----
DROP POLICY IF EXISTS "loc_history_select" ON public.firetruck_location_history;
CREATE POLICY "loc_history_select" ON public.firetruck_location_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "loc_history_insert" ON public.firetruck_location_history;
CREATE POLICY "loc_history_insert" ON public.firetruck_location_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ---- CONVERSATIONS ----
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );


-- ---- MESSAGES ----
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (
    sender_user_id IN (
      SELECT user_id FROM public.users WHERE auth_id = auth.uid()
    )
  );


-- ---- MESSAGE ATTACHMENTS ----
DROP POLICY IF EXISTS "attachments_select" ON public.message_attachments;
CREATE POLICY "attachments_select" ON public.message_attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attachments_insert" ON public.message_attachments;
CREATE POLICY "attachments_insert" ON public.message_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ---- EMERGENCY CONTACTS (public read) ----
DROP POLICY IF EXISTS "emergency_contacts_select" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_select" ON public.emergency_contacts
  FOR SELECT USING (published = true OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );

DROP POLICY IF EXISTS "emergency_contacts_write" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_write" ON public.emergency_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );


-- ---- SAFETY TIP CATEGORIES (public read) ----
DROP POLICY IF EXISTS "tip_categories_select" ON public.safety_tip_categories;
CREATE POLICY "tip_categories_select" ON public.safety_tip_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tip_categories_write" ON public.safety_tip_categories;
CREATE POLICY "tip_categories_write" ON public.safety_tip_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );


-- ---- SAFETY TIPS (public read) ----
DROP POLICY IF EXISTS "safety_tips_select" ON public.safety_tips;
CREATE POLICY "safety_tips_select" ON public.safety_tips
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "safety_tips_write" ON public.safety_tips;
CREATE POLICY "safety_tips_write" ON public.safety_tips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );


-- ---- NEWS ROOM (public read for published, admin write) ----
DROP POLICY IF EXISTS "news_select" ON public.news_room;
CREATE POLICY "news_select" ON public.news_room
  FOR SELECT USING (published = true OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );

DROP POLICY IF EXISTS "news_write" ON public.news_room;
CREATE POLICY "news_write" ON public.news_room
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );


-- ============================================================================
-- STEP 24: STORAGE BUCKET POLICIES
-- Run these AFTER creating buckets in the Supabase Dashboard
-- Dashboard → Storage → New Bucket → (name) → Create
-- ============================================================================

-- Bucket: news-images (PUBLIC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: safety-tip-images (PUBLIC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('safety-tip-images', 'safety-tip-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: message-attachments (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: profile-photos (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: news-images — anyone can read, admins can upload
DROP POLICY IF EXISTS "news_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "news_images_upload" ON storage.objects;

CREATE POLICY "news_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-images');

CREATE POLICY "news_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-images'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Storage RLS: safety-tip-images — anyone can read, admins can upload
DROP POLICY IF EXISTS "safety_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "safety_images_upload" ON storage.objects;

CREATE POLICY "safety_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'safety-tip-images');

CREATE POLICY "safety_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'safety-tip-images'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin')
    )
  );

-- Storage RLS: message-attachments — only authenticated staff
DROP POLICY IF EXISTS "msg_attachments_read"   ON storage.objects;
DROP POLICY IF EXISTS "msg_attachments_upload" ON storage.objects;

CREATE POLICY "msg_attachments_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );

CREATE POLICY "msg_attachments_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'substation_admin', 'driver')
    )
  );

-- Storage RLS: profile-photos — users can read/upload their own
DROP POLICY IF EXISTS "profile_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_upload" ON storage.objects;

CREATE POLICY "profile_photos_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "profile_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid() IS NOT NULL
  );


-- ============================================================================
-- STEP 25: SAMPLE DATA (Fire Stations + Emergency Contacts)
-- Add your real Zamboanga City coordinates
-- ============================================================================
INSERT INTO public.fire_stations (station_name, station_type, latitude, longitude, contact_number, address, head_officer)
VALUES
  ('Zamboanga Central Fire Station', 'Main',       6.9214, 122.0790, '062-991-1234', 'Gov. Lim Ave, Zamboanga City', 'Chief Fire Officer'),
  ('Sta. Catalina Fire Substation',  'Substation', 6.9100, 122.0650, '062-991-2345', 'Sta. Catalina, Zamboanga City', 'Fire Officer 1'),
  ('Poblacion Fire Substation',      'Substation', 6.9300, 122.0800, '062-991-3456', 'Poblacion, Zamboanga City',    'Fire Officer 1'),
  ('San Jose Gusu Substation',       'Substation', 6.9400, 122.0900, '062-991-4567', 'San Jose Gusu, Zamboanga City','Fire Officer 1'),
  ('Tetuan Fire Substation',         'Substation', 6.9500, 122.1000, '062-991-5678', 'Tetuan, Zamboanga City',       'Fire Officer 1')
ON CONFLICT DO NOTHING;

INSERT INTO public.emergency_contacts (category, station, hotline, location, published, sort_order)
VALUES
  ('Fire Emergency', 'BFP Zamboanga', '160',          'Zamboanga City', true, 1),
  ('Police',         'PNP Zamboanga', '117',          'Zamboanga City', true, 2),
  ('Medical',        'Red Cross',     '143',          'Zamboanga City', true, 3),
  ('NDRRMC',         'NDRRMC',        '(02) 911-1406','National',       true, 4)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- DONE!
-- ============================================================================
-- NEXT STEPS:
--
-- 1. Supabase Dashboard → Authentication → Providers:
--    ✅ Enable Email (for admin / substation_admin sign-in)
--    ✅ Enable Phone (for driver / end_user sign-in via Twilio SMS)
--       → Enter your Twilio Account SID, Auth Token, and Phone Number
--
-- 2. Supabase Dashboard → Authentication → URL Configuration:
--    → Set Site URL to your frontend domain
--    → Set Redirect URLs for email OTP confirmation
--
-- 3. Storage buckets are created by STEP 24 above.
--    Verify them in Dashboard → Storage.
--
-- 4. To register a new admin user manually (since there is no password):
--    Supabase Dashboard → Authentication → Users → Invite User → enter email
--    Then in public.users, set their role, id_number, assigned_station_id
--
-- 5. Backend: replace your custom JWT middleware with Supabase JWT verification.
--    Use service_role key in backend — it bypasses RLS completely.
-- ============================================================================
