-- Create users table in Supabase if it doesn't exist
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id BIGSERIAL PRIMARY KEY,
  id_number VARCHAR(20) UNIQUE,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  full_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  rank VARCHAR(50),
  role VARCHAR(50) DEFAULT 'end_user',
  substation VARCHAR(100),
  assigned_station_id BIGINT,
  email_verified INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security for now (for development)
-- In production, you should set up proper RLS policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_id_number ON public.users(id_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_assigned_station ON public.users(assigned_station_id);

-- Insert sample users for testing
INSERT INTO public.users (id_number, first_name, last_name, full_name, phone_number, email, password, role)
VALUES 
  ('BFP-00001', 'Super', 'Admin', 'Super Admin', '9991112222', 'super@bfp.gov', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'admin'),
  ('BFP-00002', 'John', 'Doe', 'John Doe', '9995556666', 'john@bfp.gov', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'substation_admin'),
  ('BFP-00003', 'Jane', 'Smith', 'Jane Smith', '9997778888', 'jane@bfp.gov', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'driver')
ON CONFLICT DO NOTHING;
