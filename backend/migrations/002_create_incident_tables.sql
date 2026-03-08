-- Migration: Create core incident/alarm management tables
-- Purpose: Set up tables for incident creation, tracking, and logging

-- Create alarms table (main incident/alarm records)
CREATE TABLE IF NOT EXISTS `alarms` (
  `alarm_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `end_user_id` INT NULL COMMENT 'Caller who reported the incident',
  `user_latitude` DECIMAL(10, 8) NOT NULL COMMENT 'Incident latitude coordinate',
  `user_longitude` DECIMAL(11, 8) NOT NULL COMMENT 'Incident longitude coordinate',
  `initial_alarm_level` VARCHAR(50) NOT NULL COMMENT 'Initial alarm level (Alarm 1, 2, 3, etc.)',
  `current_alarm_level` VARCHAR(50) NOT NULL COMMENT 'Current alarm level',
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending Dispatch' COMMENT 'Incident status',
  `assigned_station_id` INT NULL COMMENT 'Assigned fire station',
  `assigned_truck_id` INT NULL COMMENT 'Assigned fire truck',
  `call_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the incident was reported',
  `dispatch_time` TIMESTAMP NULL COMMENT 'When units were dispatched',
  `resolve_time` TIMESTAMP NULL COMMENT 'When the incident was resolved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`end_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_station_id`) REFERENCES `fire_stations`(`station_id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_truck_id`) REFERENCES `firetrucks`(`truck_id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_call_time` (`call_time`),
  INDEX `idx_end_user_id` (`end_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create alarm response log table (audit trail for incident actions)
CREATE TABLE IF NOT EXISTS `alarm_response_log` (
  `log_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alarm_id` INT NOT NULL COMMENT 'Reference to the alarm/incident',
  `action_type` VARCHAR(100) NOT NULL COMMENT 'Type of action (Initial Dispatch, Alarm Level Change, etc.)',
  `details` TEXT COMMENT 'Additional details about the action',
  `performed_by_user_id` INT NULL COMMENT 'User who performed the action',
  `action_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`alarm_id`) REFERENCES `alarms`(`alarm_id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_alarm_id` (`alarm_id`),
  INDEX `idx_action_timestamp` (`action_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create incident reports table (comprehensive incident documentation)
CREATE TABLE IF NOT EXISTS `incident_reports` (
  `report_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alarm_id` INT NOT NULL COMMENT 'Reference to the alarm/incident',
  `report_type` VARCHAR(50) NOT NULL COMMENT 'Type of report (Incident, Fire, Medical, etc.)',
  `incident_type` VARCHAR(100) COMMENT 'Specific incident type (Fire, Medical Emergency, etc.)',
  `location` VARCHAR(255) NOT NULL COMMENT 'Incident location address',
  `narrative` TEXT COMMENT 'Detailed narrative of the incident',
  `submitted_by_user_id` INT NULL COMMENT 'User who submitted the report',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `property_affected` VARCHAR(255) COMMENT 'Type of property affected',
  `injuries_reported` INT DEFAULT 0 COMMENT 'Number of injuries reported',
  `deaths_reported` INT DEFAULT 0 COMMENT 'Number of deaths reported',
  FOREIGN KEY (`alarm_id`) REFERENCES `alarms`(`alarm_id`) ON DELETE CASCADE,
  FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_alarm_id` (`alarm_id`),
  INDEX `idx_incident_type` (`incident_type`),
  INDEX `idx_submitted_at` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
