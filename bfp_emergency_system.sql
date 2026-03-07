-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 25, 2025 at 05:00 PM
-- Server version: 10.4.24-MariaDB
-- PHP Version: 8.1.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00"; -- Set Timezone to Philippines Time (PHT)

--
-- Database: `bfp_emergency_system`
--
CREATE DATABASE IF NOT EXISTS `bfp_emergency_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `bfp_emergency_system`;

-- --------------------------------------------------------

--
-- Table structure for table `fire_stations`
--
-- This table stores all fire stations (Main and Sub) and their static location/contact details.
-- The `is_ready` status is crucial for the KNN dispatch logic.

CREATE TABLE `fire_stations` (
  `station_id` INT(11) NOT NULL,
  `station_name` VARCHAR(100) NOT NULL,
  `province` VARCHAR(50) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `contact_number` VARCHAR(20) DEFAULT NULL,
  `latitude` DECIMAL(10,8) NOT NULL, -- Static base location for KNN calculation
  `longitude` DECIMAL(11,8) NOT NULL, -- Static base location for KNN calculation
  `is_ready` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Ready to dispatch (Default), 0=Busy/Unavailable (Set by Substation Admin)',
  `last_status_update` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `fire_stations`
--
-- Sample data based on Zamboanga City example provided in the document image.
INSERT INTO `fire_stations` (`station_id`, `station_name`, `province`, `city`, `contact_number`, `latitude`, `longitude`, `is_ready`) VALUES
(101, 'Central Fire Station', 'Zamboanga', 'Zamboanga City', '991226769588', 7.50000000, 122.00000000, 1), -- Example coordinates
(102, 'Central FSS FT 1', 'Zamboanga', 'Zamboanga City', '991226769588', 7.50100000, 122.00100000, 1),
(103, 'Sta Catalina FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.51500000, 122.01500000, 1),
(104, 'San Jose Gusu FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.52000000, 122.02000000, 1),
(105, 'Tetuan FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.53000000, 122.03000000, 0); -- Example: Not ready

-- --------------------------------------------------------

--
-- Table structure for table `firetrucks`
--
-- Stores details about each firetruck and their dynamic location (updated by the tracking app).
-- Used for the "Uber-like" tracking feature.

CREATE TABLE `firetrucks` (
  `truck_id` INT(11) NOT NULL,
  `plate_number` VARCHAR(20) NOT NULL UNIQUE,
  `model` VARCHAR(50) DEFAULT NULL,
  `station_id` INT(11) NOT NULL COMMENT 'FK to fire_stations',
  `driver_user_id` INT(11) DEFAULT NULL COMMENT 'FK to users - who is currently driving',
  `current_latitude` DECIMAL(10,8) DEFAULT NULL COMMENT 'Real-time location from firetruck tracking app',
  `current_longitude` DECIMAL(11,8) DEFAULT NULL COMMENT 'Real-time location from firetruck tracking app',
  `last_location_update` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `firetrucks`
--
INSERT INTO `firetrucks` (`truck_id`, `plate_number`, `model`, `station_id`, `driver_user_id`) VALUES
(1, 'FT-ZAMB-001', 'Hino 500', 101, NULL),
(2, 'FT-ZAMB-002', 'Isuzu FVR', 102, NULL),
(3, 'FT-ZAMB-003', 'Fuso Fighter', 103, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `alarms`
--
-- The main log for all incidents/alarms raised by the end user app.
-- This table connects the user, the station, and the dispatched truck.

CREATE TABLE `alarms` (
  `alarm_id` INT(11) NOT NULL,
  `end_user_id` INT(11) NOT NULL COMMENT 'FK to users - the person calling for help',
  `user_latitude` DECIMAL(10,8) NOT NULL COMMENT 'Coordinates sent from End-User Mobile App',
  `user_longitude` DECIMAL(11,8) NOT NULL COMMENT 'Coordinates sent from End-User Mobile App',
  `initial_alarm_level` ENUM('Alarm 1', 'Alarm 2', 'Alarm 3', 'Alarm 4', 'Alarm 5', 'General') NOT NULL DEFAULT 'Alarm 1',
  `current_alarm_level` ENUM('Alarm 1', 'Alarm 2', 'Alarm 3', 'Alarm 4', 'Alarm 5', 'General') NOT NULL DEFAULT 'Alarm 1',
  `status` ENUM('Pending Dispatch', 'Dispatched', 'En Route', 'On Scene', 'Resolved', 'Cancelled') NOT NULL DEFAULT 'Pending Dispatch',
  `dispatched_station_id` INT(11) DEFAULT NULL COMMENT 'The station assigned by KNN logic',
  `dispatched_truck_id` INT(11) DEFAULT NULL COMMENT 'The truck assigned to respond',
  `call_time` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `dispatch_time` TIMESTAMP NULL DEFAULT NULL,
  `resolve_time` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `alarms`
--
INSERT INTO `alarms` (`alarm_id`, `end_user_id`, `user_latitude`, `user_longitude`, `initial_alarm_level`, `current_alarm_level`, `status`, `dispatched_station_id`, `dispatched_truck_id`) VALUES
(1, 201, 7.55000000, 122.05000000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL); -- Example: New alarm near Central Station area

-- --------------------------------------------------------

--
-- Table structure for table `users`
--
-- Stores users for the different roles: End-Users, Drivers, Admin/Substation Admins.

CREATE TABLE `users` (
  `user_id` INT(11) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone_number` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(100) UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('end_user', 'driver', 'admin', 'substation_admin') NOT NULL,
  `assigned_station_id` INT(11) DEFAULT NULL COMMENT 'For drivers/admins, which station they belong to'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--
INSERT INTO `users` (`user_id`, `full_name`, `phone_number`, `email`, `password_hash`, `role`, `assigned_station_id`) VALUES
(1, 'Super Admin', '9991112222', 'super@bfp.gov', 'hashed_password_placeholder', 'admin', NULL),
(10, 'Substation 1 Admin', '9993334444', 'sub1@bfp.gov', 'hashed_password_placeholder', 'substation_admin', 102),
(100, 'Firetruck Driver 1', '9995556666', 'driver1@bfp.gov', 'hashed_password_placeholder', 'driver', 101),
(201, 'End User Jane Doe', '9997778888', 'jane.doe@example.com', 'hashed_password_placeholder', 'end_user', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `alarm_response_log`
--
-- Logs all actions related to an alarm, especially when the alarm level intensifies (Alarm 1 to Alarm 5).
-- This handles the need for sharing/backing up to other stations.

CREATE TABLE `alarm_response_log` (
  `log_id` INT(11) NOT NULL,
  `alarm_id` INT(11) NOT NULL COMMENT 'FK to alarms',
  `action_timestamp` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `action_type` ENUM('Initial Dispatch', 'Alarm Level Change', 'Backup Requested', 'Truck Arrival', 'Incident Resolved') NOT NULL,
  `details` TEXT DEFAULT NULL,
  `performed_by_user_id` INT(11) DEFAULT NULL COMMENT 'Admin/Driver who made the action'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
--
-- Indexes for dumped tables
--

--
-- Indexes for table `fire_stations`
--
ALTER TABLE `fire_stations`
  ADD PRIMARY KEY (`station_id`);

--
-- Indexes for table `firetrucks`
--
ALTER TABLE `firetrucks`
  ADD PRIMARY KEY (`truck_id`),
  ADD KEY `station_id` (`station_id`),
  ADD KEY `driver_user_id` (`driver_user_id`);

--
-- Indexes for table `alarms`
--
ALTER TABLE `alarms`
  ADD PRIMARY KEY (`alarm_id`),
  ADD KEY `end_user_id` (`end_user_id`),
  ADD KEY `dispatched_station_id` (`dispatched_station_id`),
  ADD KEY `dispatched_truck_id` (`dispatched_truck_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `assigned_station_id` (`assigned_station_id`);

--
-- Indexes for table `alarm_response_log`
--
ALTER TABLE `alarm_response_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `alarm_id` (`alarm_id`),
  ADD KEY `performed_by_user_id` (`performed_by_user_id`);


-- --------------------------------------------------------
--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `fire_stations`
--
ALTER TABLE `fire_stations`
  MODIFY `station_id` INT(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT = 106;

--
-- AUTO_INCREMENT for table `firetrucks`
--
ALTER TABLE `firetrucks`
  MODIFY `truck_id` INT(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT = 4;

--
-- AUTO_INCREMENT for table `alarms`
--
ALTER TABLE `alarms`
  MODIFY `alarm_id` INT(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT = 2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` INT(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT = 202;

--
-- AUTO_INCREMENT for table `alarm_response_log`
--
ALTER TABLE `alarm_response_log`
  MODIFY `log_id` INT(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------
--
-- Constraints for dumped tables
--

--
-- Constraints for table `firetrucks`
--
ALTER TABLE `firetrucks`
  ADD CONSTRAINT `firetrucks_ibfk_1` FOREIGN KEY (`station_id`) REFERENCES `fire_stations` (`station_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `firetrucks_ibfk_2` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `alarms`
--
ALTER TABLE `alarms`
  ADD CONSTRAINT `alarms_ibfk_1` FOREIGN KEY (`end_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `alarms_ibfk_2` FOREIGN KEY (`dispatched_station_id`) REFERENCES `fire_stations` (`station_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alarms_ibfk_3` FOREIGN KEY (`dispatched_truck_id`) REFERENCES `firetrucks` (`truck_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`assigned_station_id`) REFERENCES `fire_stations` (`station_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `alarm_response_log`
--
ALTER TABLE `alarm_response_log`
  ADD CONSTRAINT `alarm_response_log_ibfk_1` FOREIGN KEY (`alarm_id`) REFERENCES `alarms` (`alarm_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `alarm_response_log_ibfk_2` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

--
-- Table structure for table `firetruck_location_history`
-- Tracks historical location data for firetrucks for analytics and replay
--

CREATE TABLE IF NOT EXISTS `firetruck_location_history` (
  `history_id` INT(11) NOT NULL AUTO_INCREMENT,
  `truck_id` INT(11) NOT NULL COMMENT 'FK to firetrucks',
  `latitude` DECIMAL(10,8) NOT NULL,
  `longitude` DECIMAL(11,8) NOT NULL,
  `speed` DECIMAL(6,2) DEFAULT NULL COMMENT 'Speed in km/h, if available',
  `heading` DECIMAL(5,2) DEFAULT NULL COMMENT 'Direction in degrees (0-360)',
  `battery_level` TINYINT(3) DEFAULT NULL COMMENT 'Device battery level (0-100)',
  `accuracy` DECIMAL(5,2) DEFAULT NULL COMMENT 'GPS accuracy in meters',
  `recorded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `alarm_id` INT(11) DEFAULT NULL COMMENT 'If this location update is related to a specific alarm',
  `is_responding` TINYINT(1) DEFAULT 0 COMMENT '1=Responding to an alarm, 0=Not responding',
  PRIMARY KEY (`history_id`),
  KEY `truck_id` (`truck_id`),
  KEY `recorded_at` (`recorded_at`),
  KEY `alarm_id` (`alarm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key constraint
ALTER TABLE `firetruck_location_history`
  ADD CONSTRAINT `flh_truck_fk` FOREIGN KEY (`truck_id`) 
  REFERENCES `firetrucks` (`truck_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `flh_alarm_fk` FOREIGN KEY (`alarm_id`) 
  REFERENCES `alarms` (`alarm_id`) ON DELETE SET NULL ON UPDATE CASCADE;

  -- Add these ALTER TABLE statements to your bfp_emergency_system.sql file
ALTER TABLE `firetrucks`
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Inactive' AFTER `plate_number`,
  ADD COLUMN `last_online` TIMESTAMP NULL DEFAULT NULL COMMENT 'Last time the truck sent a location update' AFTER `last_location_update`,
  ADD COLUMN `battery_level` TINYINT(3) DEFAULT NULL COMMENT 'Last reported battery level (0-100)' AFTER `last_online`,
  ADD COLUMN `status` ENUM('available', 'on_mission', 'maintenance', 'offline') NOT NULL DEFAULT 'offline' COMMENT 'Current status of the firetruck' AFTER `battery_level`,
  ADD COLUMN `current_alarm_id` INT(11) DEFAULT NULL COMMENT 'Current alarm this truck is responding to' AFTER `status`,
  ADD COLUMN `driver_notes` TEXT DEFAULT NULL AFTER `current_alarm_id`;

-- Add foreign key for current_alarm_id
ALTER TABLE `firetrucks`
  ADD CONSTRAINT `ft_alarm_fk` FOREIGN KEY (`current_alarm_id`) 
  REFERENCES `alarms` (`alarm_id`) ON DELETE SET NULL ON UPDATE CASCADE;  


-- Add this procedure to your bfp_emergency_system.sql file
DELIMITER //
CREATE PROCEDURE `UpdateFiretruckLocation`(
    IN p_truck_id INT,
    IN p_latitude DECIMAL(10,8),
    IN p_longitude DECIMAL(11,8),
    IN p_speed DECIMAL(6,2),
    IN p_heading DECIMAL(5,2),
    IN p_battery_level TINYINT,
    IN p_accuracy DECIMAL(5,2),
    IN p_alarm_id INT
)
BEGIN
    DECLARE v_is_responding TINYINT DEFAULT 0;
    
    -- Check if this truck is assigned to an active alarm
    IF p_alarm_id IS NOT NULL THEN
        SET v_is_responding = 1;
    ELSE
        -- Check if the truck is assigned to any active alarm
        SELECT COUNT(*) INTO @active_alarm 
        FROM `alarms` 
        WHERE `dispatched_truck_id` = p_truck_id 
        AND `status` IN ('Dispatched', 'En Route', 'On Scene');
        
        IF @active_alarm > 0 THEN
            SET v_is_responding = 1;
            SET p_alarm_id = (SELECT `alarm_id` FROM `alarms` 
                             WHERE `dispatched_truck_id` = p_truck_id 
                             AND `status` IN ('Dispatched', 'En Route', 'On Scene')
                             LIMIT 1);
        END IF;
    END IF;
    
    -- Update the firetruck's current location
    UPDATE `firetrucks`
    SET 
        `current_latitude` = p_latitude,
        `current_longitude` = p_longitude,
        `last_location_update` = CURRENT_TIMESTAMP,
        `last_online` = CURRENT_TIMESTAMP,
        `battery_level` = p_battery_level,
        `status` = IF(p_alarm_id IS NOT NULL, 'on_mission', 'available'),
        `current_alarm_id` = p_alarm_id
    WHERE `truck_id` = p_truck_id;
    
    -- Log the location in history
    INSERT INTO `firetruck_location_history` (
        `truck_id`, `latitude`, `longitude`, `speed`, `heading`, 
        `battery_level`, `accuracy`, `alarm_id`, `is_responding`
    ) VALUES (
        p_truck_id, p_latitude, p_longitude, p_speed, p_heading,
        p_battery_level, p_accuracy, p_alarm_id, v_is_responding
    );
    
    -- If this is related to an alarm and the truck is near the destination, update alarm status
    IF p_alarm_id IS NOT NULL THEN
        -- Check if the truck is within 100m of the alarm location
        SELECT COUNT(*) INTO @near_alarm
        FROM `alarms` a
        WHERE a.`alarm_id` = p_alarm_id
        AND ST_Distance_Sphere(
            point(p_longitude, p_latitude),
            point(a.`user_longitude`, a.`user_latitude`)
        ) <= 100;  -- 100 meters
        
        IF @near_alarm > 0 AND (SELECT `status` FROM `alarms` WHERE `alarm_id` = p_alarm_id) = 'En Route' THEN
            UPDATE `alarms`
            SET `status` = 'On Scene'
            WHERE `alarm_id` = p_alarm_id;
            
            -- Log this status change
            INSERT INTO `alarm_response_log` (`alarm_id`, `action_type`, `details`, `performed_by_user_id`)
            VALUES (p_alarm_id, 'Truck Arrival', CONCAT('Firetruck #', p_truck_id, ' arrived at the scene'), NULL);
        END IF;
    END IF;
    
    SELECT 'Location updated successfully' AS message;
END //
DELIMITER ;

-- --------------------------------------------------------
-- Additional fields for user verification (email + phone)
-- --------------------------------------------------------

ALTER TABLE `users`
  ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `email`,
  ADD COLUMN `phone_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `email_verified`,
  ADD COLUMN `email_verify_token` VARCHAR(255) DEFAULT NULL AFTER `phone_verified`;

-- --------------------------------------------------------
-- OTP storage table for email/SMS verification codes
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_otps` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL COMMENT 'FK to users',
  `channel` ENUM('email','sms') NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `channel` (`channel`),
  KEY `expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `user_otps`
  ADD CONSTRAINT `user_otps_user_fk` FOREIGN KEY (`user_id`)
  REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- --------------------------------------------------------
-- Table structure for table `webrtc_signals`
-- Stores WebRTC signaling messages between end-users and fire stations
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `webrtc_signals` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `from_user_id` INT(11) DEFAULT NULL COMMENT 'FK to users (caller)',
  `to_station_id` INT(11) NOT NULL COMMENT 'FK to fire_stations (target station)',
  `type` ENUM('offer', 'answer', 'ice', 'bye') NOT NULL,
  `payload` TEXT NOT NULL COMMENT 'JSON-encoded SDP or ICE candidate',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consumed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=pending,1=delivered',
  PRIMARY KEY (`id`),
  KEY `to_station_id` (`to_station_id`),
  KEY `created_at` (`created_at`),
  KEY `consumed` (`consumed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `webrtc_signals`
  ADD CONSTRAINT `webrtc_signals_station_fk`
    FOREIGN KEY (`to_station_id`) REFERENCES `fire_stations` (`station_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `webrtc_signals_user_fk`
    FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE;