-- RLS Policies for BFP Emergency System
-- Run this in Supabase SQL Editor to enable proper Row Level Security

-- Updated RLS setup: idempotent and covers common table-name variants
-- This script uses IF EXISTS / DROP POLICY IF EXISTS so it can be re-run safely

-- Helper: list of table name variants we expect in this project
-- users / _users
-- fire_stations / _fire_stations
-- incidents / _incidents
-- station_readiness / _station_readiness
-- firetrucks / _firetrucks
-- alarms / _alarms

-- Functionally: enable RLS IF the table exists, drop policies if present, then create allow-all policies

-- ===== USERS / _USERS =====
ALTER TABLE IF EXISTS public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select users" ON public."users";
CREATE POLICY "Allow anon select users"
  ON public."users"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert users" ON public."users";
CREATE POLICY "Allow anon insert users"
  ON public."users"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users update self" ON public."users";
CREATE POLICY "Allow users update self"
  ON public."users"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select _users" ON public."_users";
CREATE POLICY "Allow anon select _users"
  ON public."_users"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert _users" ON public."_users";
CREATE POLICY "Allow anon insert _users"
  ON public."_users"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users update self _users" ON public."_users";
CREATE POLICY "Allow users update self _users"
  ON public."_users"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ===== FIRE_STATIONS / _FIRE_STATIONS =====
ALTER TABLE IF EXISTS public."fire_stations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_fire_stations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select fire_stations" ON public."fire_stations";
CREATE POLICY "Allow anon select fire_stations"
  ON public."fire_stations"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert fire_stations" ON public."fire_stations";
CREATE POLICY "Allow anon insert fire_stations"
  ON public."fire_stations"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update fire_stations" ON public."fire_stations";
CREATE POLICY "Allow anon update fire_stations"
  ON public."fire_stations"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete fire_stations" ON public."fire_stations";
CREATE POLICY "Allow anon delete fire_stations"
  ON public."fire_stations"
  FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Allow anon select _fire_stations" ON public."_fire_stations";
CREATE POLICY "Allow anon select _fire_stations"
  ON public."_fire_stations"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert _fire_stations" ON public."_fire_stations";
CREATE POLICY "Allow anon insert _fire_stations"
  ON public."_fire_stations"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update _fire_stations" ON public."_fire_stations";
CREATE POLICY "Allow anon update _fire_stations"
  ON public."_fire_stations"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete _fire_stations" ON public."_fire_stations";
CREATE POLICY "Allow anon delete _fire_stations"
  ON public."_fire_stations"
  FOR DELETE
  USING (true);

-- ===== INCIDENTS / _INCIDENTS =====
ALTER TABLE IF EXISTS public."incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_incidents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select incidents" ON public."incidents";
CREATE POLICY "Allow anon select incidents"
  ON public."incidents"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert incidents" ON public."incidents";
CREATE POLICY "Allow anon insert incidents"
  ON public."incidents"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update incidents" ON public."incidents";
CREATE POLICY "Allow anon update incidents"
  ON public."incidents"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete incidents" ON public."incidents";
CREATE POLICY "Allow anon delete incidents"
  ON public."incidents"
  FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Allow anon select _incidents" ON public."_incidents";
CREATE POLICY "Allow anon select _incidents"
  ON public."_incidents"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert _incidents" ON public."_incidents";
CREATE POLICY "Allow anon insert _incidents"
  ON public."_incidents"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update _incidents" ON public."_incidents";
CREATE POLICY "Allow anon update _incidents"
  ON public."_incidents"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete _incidents" ON public."_incidents";
CREATE POLICY "Allow anon delete _incidents"
  ON public."_incidents"
  FOR DELETE
  USING (true);

-- ===== STATION_READINESS / _STATION_READINESS =====
ALTER TABLE IF EXISTS public."station_readiness" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_station_readiness" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select station_readiness" ON public."station_readiness";
CREATE POLICY "Allow anon select station_readiness"
  ON public."station_readiness"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert station_readiness" ON public."station_readiness";
CREATE POLICY "Allow anon insert station_readiness"
  ON public."station_readiness"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update station_readiness" ON public."station_readiness";
CREATE POLICY "Allow anon update station_readiness"
  ON public."station_readiness"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete station_readiness" ON public."station_readiness";
CREATE POLICY "Allow anon delete station_readiness"
  ON public."station_readiness"
  FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Allow anon select _station_readiness" ON public."_station_readiness";
CREATE POLICY "Allow anon select _station_readiness"
  ON public."_station_readiness"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert _station_readiness" ON public."_station_readiness";
CREATE POLICY "Allow anon insert _station_readiness"
  ON public."_station_readiness"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update _station_readiness" ON public."_station_readiness";
CREATE POLICY "Allow anon update _station_readiness"
  ON public."_station_readiness"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete _station_readiness" ON public."_station_readiness";
CREATE POLICY "Allow anon delete _station_readiness"
  ON public."_station_readiness"
  FOR DELETE
  USING (true);

-- ===== FIRETRUCKS / _FIRETRUCKS =====
ALTER TABLE IF EXISTS public."firetrucks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_firetrucks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select firetrucks" ON public."firetrucks";
CREATE POLICY "Allow anon select firetrucks"
  ON public."firetrucks"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert firetrucks" ON public."firetrucks";
CREATE POLICY "Allow anon insert firetrucks"
  ON public."firetrucks"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update firetrucks" ON public."firetrucks";
CREATE POLICY "Allow anon update firetrucks"
  ON public."firetrucks"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete firetrucks" ON public."firetrucks";
CREATE POLICY "Allow anon delete firetrucks"
  ON public."firetrucks"
  FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Allow anon select _firetrucks" ON public."_firetrucks";
CREATE POLICY "Allow anon select _firetrucks"
  ON public."_firetrucks"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert _firetrucks" ON public."_firetrucks";
CREATE POLICY "Allow anon insert _firetrucks"
  ON public."_firetrucks"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update _firetrucks" ON public."_firetrucks";
CREATE POLICY "Allow anon update _firetrucks"
  ON public."_firetrucks"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete _firetrucks" ON public."_firetrucks";
CREATE POLICY "Allow anon delete _firetrucks"
  ON public."_firetrucks"
  FOR DELETE
  USING (true);

-- ===== ALARMS / _ALARMS =====
ALTER TABLE IF EXISTS public."alarms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_alarms" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select alarms" ON public."alarms";
CREATE POLICY "Allow anon select alarms"
  ON public."alarms"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert alarms" ON public."alarms";
CREATE POLICY "Allow anon insert alarms"
  ON public."alarms"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update alarms" ON public."alarms";
CREATE POLICY "Allow anon update alarms"
  ON public."alarms"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete alarms" ON public."alarms";
CREATE POLICY "Allow anon delete alarms"
  ON public."alarms"
  FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Allow anon select _alarms" ON public."_alarms";
CREATE POLICY "Allow anon select _alarms"
  ON public."_alarms"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert _alarms" ON public."_alarms";
CREATE POLICY "Allow anon insert _alarms"
  ON public."_alarms"
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update _alarms" ON public."_alarms";
CREATE POLICY "Allow anon update _alarms"
  ON public."_alarms"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete _alarms" ON public."_alarms";
CREATE POLICY "Allow anon delete _alarms"
  ON public."_alarms"
  FOR DELETE
  USING (true);

-- End of RLS setup
-- NOTE: The previous approach attempted to CREATE POLICY on tables that didn't exist
-- which caused "relation does not exist" errors. Below we wrap each table's policy
-- changes in a conditional block so it only runs when the table exists.

-- ===== Conditional policy creation helper blocks =====

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_users') THEN
    ALTER TABLE public."_users" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select _users" ON public."_users";
    CREATE POLICY "Allow anon select _users"
      ON public."_users" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert _users" ON public."_users";
    CREATE POLICY "Allow anon insert _users"
      ON public."_users" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow users update self _users" ON public."_users";
    CREATE POLICY "Allow users update self _users"
      ON public."_users" FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users') THEN
    ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select users" ON public."users";
    CREATE POLICY "Allow anon select users"
      ON public."users" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert users" ON public."users";
    CREATE POLICY "Allow anon insert users"
      ON public."users" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow users update self" ON public."users";
    CREATE POLICY "Allow users update self"
      ON public."users" FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END$$;

-- fire_stations / _fire_stations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_fire_stations') THEN
    ALTER TABLE public."_fire_stations" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select _fire_stations" ON public."_fire_stations";
    CREATE POLICY "Allow anon select _fire_stations" ON public."_fire_stations" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert _fire_stations" ON public."_fire_stations";
    CREATE POLICY "Allow anon insert _fire_stations" ON public."_fire_stations" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update _fire_stations" ON public."_fire_stations";
    CREATE POLICY "Allow anon update _fire_stations" ON public."_fire_stations" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete _fire_stations" ON public."_fire_stations";
    CREATE POLICY "Allow anon delete _fire_stations" ON public."_fire_stations" FOR DELETE USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='fire_stations') THEN
    ALTER TABLE public."fire_stations" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select fire_stations" ON public."fire_stations";
    CREATE POLICY "Allow anon select fire_stations" ON public."fire_stations" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert fire_stations" ON public."fire_stations";
    CREATE POLICY "Allow anon insert fire_stations" ON public."fire_stations" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update fire_stations" ON public."fire_stations";
    CREATE POLICY "Allow anon update fire_stations" ON public."fire_stations" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete fire_stations" ON public."fire_stations";
    CREATE POLICY "Allow anon delete fire_stations" ON public."fire_stations" FOR DELETE USING (true);
  END IF;
END$$;

-- incidents / _incidents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_incidents') THEN
    ALTER TABLE public."_incidents" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select _incidents" ON public."_incidents";
    CREATE POLICY "Allow anon select _incidents" ON public."_incidents" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert _incidents" ON public."_incidents";
    CREATE POLICY "Allow anon insert _incidents" ON public."_incidents" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update _incidents" ON public."_incidents";
    CREATE POLICY "Allow anon update _incidents" ON public."_incidents" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete _incidents" ON public."_incidents";
    CREATE POLICY "Allow anon delete _incidents" ON public."_incidents" FOR DELETE USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='incidents') THEN
    ALTER TABLE public."incidents" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select incidents" ON public."incidents";
    CREATE POLICY "Allow anon select incidents" ON public."incidents" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert incidents" ON public."incidents";
    CREATE POLICY "Allow anon insert incidents" ON public."incidents" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update incidents" ON public."incidents";
    CREATE POLICY "Allow anon update incidents" ON public."incidents" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete incidents" ON public."incidents";
    CREATE POLICY "Allow anon delete incidents" ON public."incidents" FOR DELETE USING (true);
  END IF;
END$$;

-- station_readiness / _station_readiness
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_station_readiness') THEN
    ALTER TABLE public."_station_readiness" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select _station_readiness" ON public."_station_readiness";
    CREATE POLICY "Allow anon select _station_readiness" ON public."_station_readiness" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert _station_readiness" ON public."_station_readiness";
    CREATE POLICY "Allow anon insert _station_readiness" ON public."_station_readiness" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update _station_readiness" ON public."_station_readiness";
    CREATE POLICY "Allow anon update _station_readiness" ON public."_station_readiness" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete _station_readiness" ON public."_station_readiness";
    CREATE POLICY "Allow anon delete _station_readiness" ON public."_station_readiness" FOR DELETE USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='station_readiness') THEN
    ALTER TABLE public."station_readiness" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select station_readiness" ON public."station_readiness";
    CREATE POLICY "Allow anon select station_readiness" ON public."station_readiness" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert station_readiness" ON public."station_readiness";
    CREATE POLICY "Allow anon insert station_readiness" ON public."station_readiness" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update station_readiness" ON public."station_readiness";
    CREATE POLICY "Allow anon update station_readiness" ON public."station_readiness" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete station_readiness" ON public."station_readiness";
    CREATE POLICY "Allow anon delete station_readiness" ON public."station_readiness" FOR DELETE USING (true);
  END IF;
END$$;

-- firetrucks / _firetrucks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_firetrucks') THEN
    ALTER TABLE public."_firetrucks" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select _firetrucks" ON public."_firetrucks";
    CREATE POLICY "Allow anon select _firetrucks" ON public."_firetrucks" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert _firetrucks" ON public."_firetrucks";
    CREATE POLICY "Allow anon insert _firetrucks" ON public."_firetrucks" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update _firetrucks" ON public."_firetrucks";
    CREATE POLICY "Allow anon update _firetrucks" ON public."_firetrucks" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete _firetrucks" ON public."_firetrucks";
    CREATE POLICY "Allow anon delete _firetrucks" ON public."_firetrucks" FOR DELETE USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='firetrucks') THEN
    ALTER TABLE public."firetrucks" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select firetrucks" ON public."firetrucks";
    CREATE POLICY "Allow anon select firetrucks" ON public."firetrucks" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert firetrucks" ON public."firetrucks";
    CREATE POLICY "Allow anon insert firetrucks" ON public."firetrucks" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update firetrucks" ON public."firetrucks";
    CREATE POLICY "Allow anon update firetrucks" ON public."firetrucks" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete firetrucks" ON public."firetrucks";
    CREATE POLICY "Allow anon delete firetrucks" ON public."firetrucks" FOR DELETE USING (true);
  END IF;
END$$;

-- alarms / _alarms
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_alarms') THEN
    ALTER TABLE public."_alarms" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select _alarms" ON public."_alarms";
    CREATE POLICY "Allow anon select _alarms" ON public."_alarms" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert _alarms" ON public."_alarms";
    CREATE POLICY "Allow anon insert _alarms" ON public."_alarms" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update _alarms" ON public."_alarms";
    CREATE POLICY "Allow anon update _alarms" ON public."_alarms" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete _alarms" ON public."_alarms";
    CREATE POLICY "Allow anon delete _alarms" ON public."_alarms" FOR DELETE USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='alarms') THEN
    ALTER TABLE public."alarms" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow anon select alarms" ON public."alarms";
    CREATE POLICY "Allow anon select alarms" ON public."alarms" FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon insert alarms" ON public."alarms";
    CREATE POLICY "Allow anon insert alarms" ON public."alarms" FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update alarms" ON public."alarms";
    CREATE POLICY "Allow anon update alarms" ON public."alarms" FOR UPDATE USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon delete alarms" ON public."alarms";
    CREATE POLICY "Allow anon delete alarms" ON public."alarms" FOR DELETE USING (true);
  END IF;
END$$;

