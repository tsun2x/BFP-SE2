-- BFP Emergency System - PostgreSQL Schema for Supabase (with Auth linkage)
-- All foreign keys, relationships, and permissive RLS policies included
-- Includes linkage to Supabase auth.users for email OTP

-- USERS TABLE (linked to Supabase Auth)
CREATE TABLE public.users (
  user_id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  id_number VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255), -- can be NULL if using only Supabase Auth
  role VARCHAR(50) NOT NULL DEFAULT 'end_user',
  rank VARCHAR(100),
  substation VARCHAR(100),
  assigned_station_id BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIRE STATIONS
CREATE TABLE public.fire_stations (
  station_id BIGSERIAL PRIMARY KEY,
  station_name VARCHAR(255) NOT NULL,
  station_type VARCHAR(50) NOT NULL DEFAULT 'Substation',
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  contact_number VARCHAR(20),
  address VARCHAR(255),
  head_officer VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  conversation_id BIGSERIAL PRIMARY KEY,
  station_a_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  station_b_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE public.messages (
  message_id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  sender_station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  recipient_station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  sender_user_id BIGINT REFERENCES public.users(user_id),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  deleted_by_sender BOOLEAN DEFAULT FALSE,
  deleted_by_recipient BOOLEAN DEFAULT FALSE
);

-- MESSAGE ATTACHMENTS
CREATE TABLE public.message_attachments (
  attachment_id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALARMS
CREATE TABLE public.alarms (
  alarm_id BIGSERIAL PRIMARY KEY,
  end_user_id BIGINT REFERENCES public.users(user_id),
  user_latitude DECIMAL(10,8) NOT NULL,
  user_longitude DECIMAL(11,8) NOT NULL,
  initial_alarm_level VARCHAR(50) NOT NULL,
  current_alarm_level VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Dispatch',
  assigned_station_id BIGINT REFERENCES public.fire_stations(station_id),
  assigned_truck_id BIGINT REFERENCES public.firetrucks(truck_id),
  call_time TIMESTAMPTZ DEFAULT NOW(),
  dispatch_time TIMESTAMPTZ,
  resolve_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALARM RESPONSE LOG
CREATE TABLE public.alarm_response_log (
  log_id BIGSERIAL PRIMARY KEY,
  alarm_id BIGINT NOT NULL REFERENCES public.alarms(alarm_id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  details TEXT,
  performed_by_user_id BIGINT REFERENCES public.users(user_id),
  action_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- OFFICER LOGIN HISTORY
CREATE TABLE public.officer_login_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(user_id),
  station_id BIGINT REFERENCES public.fire_stations(station_id),
  login_time TIMESTAMPTZ DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  status VARCHAR(20)
);

-- STATION READINESS
CREATE TABLE public.station_readiness (
  readiness_id BIGSERIAL PRIMARY KEY,
  station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id) ON DELETE CASCADE,
  submitted_by_user_id BIGINT REFERENCES public.users(user_id),
  status VARCHAR(50) NOT NULL DEFAULT 'NOT_READY',
  readiness_percentage INT DEFAULT 0,
  equipment_checklist JSONB,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIRETRUCKS
CREATE TABLE public.firetrucks (
  truck_id BIGSERIAL PRIMARY KEY,
  truck_code VARCHAR(50) UNIQUE NOT NULL,
  truck_name VARCHAR(100),
  assigned_station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  truck_type VARCHAR(50),
  capacity INT,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  is_active BOOLEAN DEFAULT TRUE,
  last_location_update TIMESTAMPTZ,
  driver_id BIGINT REFERENCES public.users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIRETRUCK STATUS
CREATE TABLE public.firetruck_status (
  id BIGSERIAL PRIMARY KEY,
  truck_id BIGINT NOT NULL REFERENCES public.firetrucks(truck_id) ON DELETE CASCADE,
  alarm_id BIGINT REFERENCES public.alarms(alarm_id),
  status VARCHAR(50),
  location_image TEXT,
  additional_image TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  author BIGINT REFERENCES public.users(user_id)
);

-- FIRETRUCK LOCATION HISTORY
CREATE TABLE public.firetruck_location_history (
  location_id BIGSERIAL PRIMARY KEY,
  truck_id BIGINT NOT NULL REFERENCES public.firetrucks(truck_id) ON DELETE CASCADE,
  alarm_id BIGINT REFERENCES public.alarms(alarm_id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed DECIMAL(5,2),
  heading DECIMAL(6,2),
  accuracy DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMERGENCY CONTACTS
CREATE TABLE public.emergency_contacts (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(100),
  location VARCHAR(255),
  contact_name VARCHAR(255),
  phone_number VARCHAR(50),
  sort_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INCIDENT REPORTS
CREATE TABLE public.incident_reports (
  report_id BIGSERIAL PRIMARY KEY,
  alarm_id BIGINT NOT NULL REFERENCES public.alarms(alarm_id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  incident_type VARCHAR(100),
  location VARCHAR(255) NOT NULL,
  narrative TEXT,
  submitted_by_user_id BIGINT REFERENCES public.users(user_id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  property_affected VARCHAR(255),
  injuries_reported INT DEFAULT 0,
  deaths_reported INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEWS ROOM
CREATE TABLE public.news_room (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  author BIGINT REFERENCES public.users(user_id)
);

-- SAFETY TIP CATEGORIES
CREATE TABLE public.safety_tip_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAFETY TIPS
CREATE TABLE public.safety_tips (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES public.safety_tip_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== RLS (Row Level Security) ========== --
-- Enable RLS and add permissive policies for all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS select_all ON public.' || quote_ident(r.tablename) || ';';
    EXECUTE 'CREATE POLICY select_all ON public.' || quote_ident(r.tablename) || ' FOR SELECT USING (true);';
    EXECUTE 'DROP POLICY IF EXISTS insert_all ON public.' || quote_ident(r.tablename) || ';';
    EXECUTE 'CREATE POLICY insert_all ON public.' || quote_ident(r.tablename) || ' FOR INSERT WITH CHECK (true);';
    EXECUTE 'DROP POLICY IF EXISTS update_all ON public.' || quote_ident(r.tablename) || ';';
    EXECUTE 'CREATE POLICY update_all ON public.' || quote_ident(r.tablename) || ' FOR UPDATE USING (true) WITH CHECK (true);';
    EXECUTE 'DROP POLICY IF EXISTS delete_all ON public.' || quote_ident(r.tablename) || ';';
    EXECUTE 'CREATE POLICY delete_all ON public.' || quote_ident(r.tablename) || ' FOR DELETE USING (true);';
  END LOOP;
END $$;

-- ========== SAMPLE DATA FOR TESTING ========== --
-- Sample Fire Stations
INSERT INTO public.fire_stations (station_name, station_type, latitude, longitude, contact_number, address, head_officer)
VALUES
  ('Central Fire Station', 'Main', 14.5995, 120.9842, '024-1234567', 'Gov. Teves Ave., Makati', 'Chief Officer Juan Santos'),
  ('Sta. Catalina Fire Station', 'Substation', 14.5547, 121.0244, '024-7654321', 'Sta. Catalina, Makati', 'Fire Officer Jose Cruz'),
  ('Poblacion Fire Station', 'Substation', 14.5590, 120.9745, '024-5555555', 'Poblacion, Makati', 'Fire Officer Maria Reyes')
ON CONFLICT DO NOTHING;

-- Sample Admin User
INSERT INTO public.users (
  id_number, first_name, last_name, full_name, email, phone_number, 
  password, role, rank, assigned_station_id
)
SELECT
  'BFP-00001', 'Admin', 'User', 'Admin User',
  'admin@bfp.gov.ph', '9991234567',
  '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky',
  'admin', 'Chief Officer', fs.station_id
FROM public.fire_stations fs
WHERE fs.station_name = 'Central Fire Station'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE phone_number = '9991234567')
ON CONFLICT DO NOTHING;

-- Sample Substation Admin User
INSERT INTO public.users (
  id_number, first_name, last_name, full_name, email, phone_number,
  password, role, rank, assigned_station_id
)
SELECT
  'BFP-00002', 'John', 'Doe', 'John Doe',
  'john@bfp.gov.ph', '9995556666',
  '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky',
  'substation_admin', 'Fire Officer 1', fs.station_id
FROM public.fire_stations fs
WHERE fs.station_name = 'Sta. Catalina Fire Station'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE phone_number = '9995556666')
ON CONFLICT DO NOTHING;

-- Sample Driver User
INSERT INTO public.users (
  id_number, first_name, last_name, full_name, email, phone_number,
  password, role, rank, assigned_station_id
)
SELECT
  'BFP-00003', 'Jane', 'Smith', 'Jane Smith',
  'jane@bfp.gov.ph', '9997778888',
  '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky',
  'driver', 'Fire Officer 2', fs.station_id
FROM public.fire_stations fs
WHERE fs.station_name = 'Poblacion Fire Station'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE phone_number = '9997778888')
ON CONFLICT DO NOTHING;

-- Sample Firetrucks
INSERT INTO public.firetrucks (
  truck_code, truck_name, assigned_station_id, truck_type, capacity, is_active, driver_id
)
SELECT
  'TR-001', 'Fire Engine Alpha', fs.station_id, 'Fire Engine', 2000, TRUE, u.user_id
FROM public.fire_stations fs
JOIN public.users u ON u.assigned_station_id = fs.station_id AND u.role = 'driver'
WHERE fs.station_name = 'Central Fire Station'
  AND NOT EXISTS (SELECT 1 FROM public.firetrucks WHERE truck_code = 'TR-001')
LIMIT 1
ON CONFLICT DO NOTHING;

-- ========== END OF SCHEMA ==========