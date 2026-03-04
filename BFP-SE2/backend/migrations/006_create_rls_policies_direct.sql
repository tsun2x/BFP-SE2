-- RLS Policies - Direct Creation (No DO blocks)
-- Target tables: _users, users, _fire_stations, _firetrucks, _station_readiness, _alarms
-- Run this in Supabase SQL Editor

-- ===== _USERS =====
DROP POLICY IF EXISTS "allow all select" ON public."_users";
DROP POLICY IF EXISTS "allow all insert" ON public."_users";
DROP POLICY IF EXISTS "allow all update" ON public."_users";
DROP POLICY IF EXISTS "allow all delete" ON public."_users";

CREATE POLICY "allow all select" ON public."_users" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."_users" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."_users" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."_users" FOR DELETE USING (true);

-- ===== USERS =====
DROP POLICY IF EXISTS "allow all select" ON public."users";
DROP POLICY IF EXISTS "allow all insert" ON public."users";
DROP POLICY IF EXISTS "allow all update" ON public."users";
DROP POLICY IF EXISTS "allow all delete" ON public."users";

CREATE POLICY "allow all select" ON public."users" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."users" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."users" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."users" FOR DELETE USING (true);

-- ===== _FIRE_STATIONS =====
DROP POLICY IF EXISTS "allow all select" ON public."_fire_stations";
DROP POLICY IF EXISTS "allow all insert" ON public."_fire_stations";
DROP POLICY IF EXISTS "allow all update" ON public."_fire_stations";
DROP POLICY IF EXISTS "allow all delete" ON public."_fire_stations";

CREATE POLICY "allow all select" ON public."_fire_stations" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."_fire_stations" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."_fire_stations" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."_fire_stations" FOR DELETE USING (true);

-- ===== _FIRETRUCKS =====
DROP POLICY IF EXISTS "allow all select" ON public."_firetrucks";
DROP POLICY IF EXISTS "allow all insert" ON public."_firetrucks";
DROP POLICY IF EXISTS "allow all update" ON public."_firetrucks";
DROP POLICY IF EXISTS "allow all delete" ON public."_firetrucks";

CREATE POLICY "allow all select" ON public."_firetrucks" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."_firetrucks" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."_firetrucks" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."_firetrucks" FOR DELETE USING (true);

-- ===== _STATION_READINESS =====
DROP POLICY IF EXISTS "allow all select" ON public."_station_readiness";
DROP POLICY IF EXISTS "allow all insert" ON public."_station_readiness";
DROP POLICY IF EXISTS "allow all update" ON public."_station_readiness";
DROP POLICY IF EXISTS "allow all delete" ON public."_station_readiness";

CREATE POLICY "allow all select" ON public."_station_readiness" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."_station_readiness" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."_station_readiness" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."_station_readiness" FOR DELETE USING (true);

-- ===== _ALARMS =====
DROP POLICY IF EXISTS "allow all select" ON public."_alarms";
DROP POLICY IF EXISTS "allow all insert" ON public."_alarms";
DROP POLICY IF EXISTS "allow all update" ON public."_alarms";
DROP POLICY IF EXISTS "allow all delete" ON public."_alarms";

CREATE POLICY "allow all select" ON public."_alarms" FOR SELECT USING (true);
CREATE POLICY "allow all insert" ON public."_alarms" FOR INSERT WITH CHECK (true);
CREATE POLICY "allow all update" ON public."_alarms" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow all delete" ON public."_alarms" FOR DELETE USING (true);

-- Policies created successfully!
