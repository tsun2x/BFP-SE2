-- BFP Emergency System Schema for Supabase
-- Copy and paste this entire script into Supabase SQL Editor

-- Create fire_stations table
CREATE TABLE IF NOT EXISTS public.fire_stations (
  station_id BIGSERIAL PRIMARY KEY,
  station_name VARCHAR(100) NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  contact_number VARCHAR(20),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  station_type VARCHAR(20) DEFAULT 'Substation',
  is_ready BOOLEAN DEFAULT true,
  last_status_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id BIGSERIAL PRIMARY KEY,
  id_number VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  full_name VARCHAR(100),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  rank VARCHAR(50),
  role VARCHAR(50) DEFAULT 'end_user',
  substation VARCHAR(100),
  assigned_station_id BIGINT REFERENCES public.fire_stations(station_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create firetrucks table
CREATE TABLE IF NOT EXISTS public.firetrucks (
  truck_id BIGSERIAL PRIMARY KEY,
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  model VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  driver_user_id BIGINT REFERENCES public.users(user_id),
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_online TIMESTAMP,
  battery_level SMALLINT,
  status VARCHAR(50) DEFAULT 'offline',
  current_alarm_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create alarms table
CREATE TABLE IF NOT EXISTS public.alarms (
  alarm_id BIGSERIAL PRIMARY KEY,
  end_user_id BIGINT NOT NULL REFERENCES public.users(user_id),
  user_latitude DECIMAL(10,8) NOT NULL,
  user_longitude DECIMAL(11,8) NOT NULL,
  initial_alarm_level VARCHAR(50) DEFAULT 'Alarm 1',
  current_alarm_level VARCHAR(50) DEFAULT 'Alarm 1',
  status VARCHAR(50) DEFAULT 'Pending Dispatch',
  dispatched_station_id BIGINT REFERENCES public.fire_stations(station_id),
  dispatched_truck_id BIGINT REFERENCES public.firetrucks(truck_id),
  call_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispatch_time TIMESTAMP,
  resolve_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create alarm_response_log table
CREATE TABLE IF NOT EXISTS public.alarm_response_log (
  log_id BIGSERIAL PRIMARY KEY,
  alarm_id BIGINT NOT NULL REFERENCES public.alarms(alarm_id) ON DELETE CASCADE,
  action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_type VARCHAR(100),
  details TEXT,
  performed_by_user_id BIGINT REFERENCES public.users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create firetruck_location_history table
CREATE TABLE IF NOT EXISTS public.firetruck_location_history (
  history_id BIGSERIAL PRIMARY KEY,
  truck_id BIGINT NOT NULL REFERENCES public.firetrucks(truck_id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed DECIMAL(6,2),
  heading DECIMAL(5,2),
  battery_level SMALLINT,
  accuracy DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  alarm_id BIGINT REFERENCES public.alarms(alarm_id) ON DELETE SET NULL,
  is_responding BOOLEAN DEFAULT false
);

-- Create station_readiness table
CREATE TABLE IF NOT EXISTS public.station_readiness (
  readiness_id BIGSERIAL PRIMARY KEY,
  station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id),
  is_ready BOOLEAN DEFAULT true,
  updated_by_user_id BIGINT REFERENCES public.users(user_id),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample fire stations
INSERT INTO public.fire_stations (station_name, province, city, contact_number, latitude, longitude, station_type)
VALUES 
  ('Central Fire Station', 'Zamboanga', 'Zamboanga City', '991226769588', 7.50000000, 122.00000000, 'Main'),
  ('Central FSS FT 1', 'Zamboanga', 'Zamboanga City', '991226769588', 7.50100000, 122.00100000, 'Substation'),
  ('Sta Catalina FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.51500000, 122.01500000, 'Substation'),
  ('San Jose Gusu FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.52000000, 122.02000000, 'Substation'),
  ('Tetuan FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.53000000, 122.03000000, 'Substation')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_id_number ON public.users(id_number);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_assigned_station ON public.users(assigned_station_id);
CREATE INDEX IF NOT EXISTS idx_alarms_end_user ON public.alarms(end_user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_status ON public.alarms(status);
CREATE INDEX IF NOT EXISTS idx_firetrucks_station ON public.firetrucks(station_id);
CREATE INDEX IF NOT EXISTS idx_firetruck_location_history_truck ON public.firetruck_location_history(truck_id);
