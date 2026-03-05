-- Migration: Add station_type to fire_stations table
-- Purpose: Distinguish between Main and Substation fire stations for dispatch routing

ALTER TABLE `fire_stations`
  ADD COLUMN `station_type` ENUM('Main', 'Substation') NOT NULL DEFAULT 'Substation'
  COMMENT 'Main = Central fire station; Substation = branch fire station';

-- Mark the existing Central Fire Station (ID 101) as Main
UPDATE `fire_stations` SET `station_type` = 'Main' WHERE `station_id` = 101;

-- All other stations are Substations (already set by DEFAULT)
