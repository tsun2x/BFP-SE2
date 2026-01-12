-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 01, 2025 at 02:55 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bfp_emergency_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `alarms`
--

CREATE TABLE `alarms` (
  `alarm_id` int(11) NOT NULL,
  `end_user_id` int(11) NOT NULL COMMENT 'FK to users - the person calling for help',
  `user_latitude` decimal(10,8) NOT NULL COMMENT 'Coordinates sent from End-User Mobile App',
  `user_longitude` decimal(11,8) NOT NULL COMMENT 'Coordinates sent from End-User Mobile App',
  `initial_alarm_level` enum('Alarm 1','Alarm 2','Alarm 3','Alarm 4','Alarm 5','General') NOT NULL DEFAULT 'Alarm 1',
  `current_alarm_level` enum('Alarm 1','Alarm 2','Alarm 3','Alarm 4','Alarm 5','General') NOT NULL DEFAULT 'Alarm 1',
  `status` enum('Pending Dispatch','Dispatched','En Route','On Scene','Resolved','Cancelled') NOT NULL DEFAULT 'Pending Dispatch',
  `dispatched_station_id` int(11) DEFAULT NULL COMMENT 'The station assigned by KNN logic',
  `dispatched_truck_id` int(11) DEFAULT NULL COMMENT 'The truck assigned to respond',
  `call_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `dispatch_time` timestamp NULL DEFAULT NULL,
  `resolve_time` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alarms`
--

INSERT INTO `alarms` (`alarm_id`, `end_user_id`, `user_latitude`, `user_longitude`, `initial_alarm_level`, `current_alarm_level`, `status`, `dispatched_station_id`, `dispatched_truck_id`, `call_time`, `dispatch_time`, `resolve_time`) VALUES
(1, 201, 7.55000000, 122.05000000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-28 13:10:23', NULL, NULL),
(2, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-28 16:41:19', NULL, NULL),
(3, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-29 23:44:31', NULL, NULL),
(4, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-29 23:47:33', NULL, NULL),
(5, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-29 23:49:27', NULL, NULL),
(6, 503, 6.90805936, 122.08019242, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 00:52:06', NULL, NULL),
(7, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 00:54:51', NULL, NULL),
(8, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 01:01:24', NULL, NULL),
(9, 503, 6.89164405, 122.09742957, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 03:17:05', NULL, NULL),
(10, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 03:17:49', NULL, NULL),
(11, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 03:27:22', NULL, NULL),
(12, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 03:32:14', NULL, NULL),
(13, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 03:33:36', NULL, NULL),
(14, 513, 14.59940000, 120.98440000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:02:39', NULL, NULL),
(15, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:03:17', NULL, NULL),
(16, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:03:33', NULL, NULL),
(17, 513, 14.59940000, 120.98440000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:22:41', NULL, NULL),
(18, 513, 14.59940000, 120.98440000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:23:29', NULL, NULL),
(19, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:23:52', NULL, NULL),
(20, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:26:49', NULL, NULL),
(21, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:27:10', NULL, NULL),
(22, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:31:09', NULL, NULL),
(23, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:32:40', NULL, NULL),
(24, 503, 14.59950000, 120.98420000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:49:37', NULL, NULL),
(25, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 04:50:03', NULL, NULL),
(26, 503, 14.59950000, 120.98420000, 'Alarm 4', 'Alarm 4', 'Pending Dispatch', NULL, NULL, '2025-11-30 05:07:11', NULL, NULL),
(27, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 06:09:16', NULL, NULL),
(28, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 06:11:02', NULL, NULL),
(29, 513, 14.59940000, 120.98440000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 11:28:16', NULL, NULL),
(30, 503, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 11:43:42', NULL, NULL),
(31, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 11:56:11', NULL, NULL),
(32, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 11:56:46', NULL, NULL),
(33, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:15:29', NULL, NULL),
(34, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:22:59', NULL, NULL),
(35, 521, 14.59950000, 120.98420000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:28:06', NULL, NULL),
(36, 521, 14.59950000, 120.98420000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:28:50', NULL, NULL),
(37, 521, 14.59950000, 120.98420000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:31:07', NULL, NULL),
(38, 521, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:31:18', NULL, NULL),
(39, 521, 14.59215785, 121.01375641, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:31:30', NULL, NULL),
(40, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 12:41:39', NULL, NULL),
(41, 513, 14.59940000, 120.98440000, 'Alarm 1', 'Alarm 1', 'Pending Dispatch', NULL, NULL, '2025-11-30 13:09:40', NULL, NULL),
(42, 514, 14.60910000, 120.98240000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 13:11:26', NULL, NULL),
(43, 521, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 14:12:12', NULL, NULL),
(44, 513, 14.59940000, 120.98440000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:45:41', NULL, NULL),
(45, 513, 14.59940000, 120.98440000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:45:41', NULL, NULL),
(46, 513, 14.59940000, 120.98440000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:45:41', NULL, NULL),
(47, 513, 14.58675567, 121.15533224, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:50:07', NULL, NULL),
(48, 513, 14.58675567, 121.15533224, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:50:07', NULL, NULL),
(49, 513, 14.58675567, 121.15533224, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:50:07', NULL, NULL),
(50, 521, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:57:11', NULL, NULL),
(51, 521, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:57:11', NULL, NULL),
(52, 521, 14.59950000, 120.98420000, '', '', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:57:11', NULL, NULL),
(53, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:58:56', NULL, NULL),
(54, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:58:56', NULL, NULL),
(55, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-11-30 15:58:56', NULL, NULL),
(56, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-12-01 10:52:22', NULL, NULL),
(57, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-12-01 10:52:22', NULL, NULL),
(58, 514, 14.60910000, 120.98240000, 'Alarm 2', 'Alarm 2', 'Pending Dispatch', NULL, NULL, '2025-12-01 10:52:22', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `alarm_response_log`
--

CREATE TABLE `alarm_response_log` (
  `log_id` int(11) NOT NULL,
  `alarm_id` int(11) NOT NULL COMMENT 'FK to alarms',
  `action_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `action_type` enum('Initial Dispatch','Alarm Level Change','Backup Requested','Truck Arrival','Incident Resolved') NOT NULL,
  `details` text DEFAULT NULL,
  `performed_by_user_id` int(11) DEFAULT NULL COMMENT 'Admin/Driver who made the action'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alarm_response_log`
--

INSERT INTO `alarm_response_log` (`log_id`, `alarm_id`, `action_timestamp`, `action_type`, `details`, `performed_by_user_id`) VALUES
(1, 2, '2025-11-28 16:41:19', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: No details', NULL),
(2, 3, '2025-11-29 23:44:31', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: No details', NULL),
(3, 4, '2025-11-29 23:47:33', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: No details', NULL),
(4, 5, '2025-11-29 23:49:27', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: No details', NULL),
(5, 6, '2025-11-30 00:52:06', 'Initial Dispatch', 'Incident: Fire | Location: 6.9081, 122.0802 | Narrative: test ', NULL),
(6, 7, '2025-11-30 00:54:51', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: asdasd', NULL),
(7, 8, '2025-11-30 01:01:24', 'Initial Dispatch', 'Incident: Medical Emergency | Location: 123 Main St, Barangay 1 | Narrative: wes', NULL),
(8, 9, '2025-11-30 03:17:05', 'Initial Dispatch', 'Incident: Not specified | Location: 6.8916, 122.0974 | Narrative: testing to recive the branch', NULL),
(9, 10, '2025-11-30 03:17:49', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: anbother test', NULL),
(10, 11, '2025-11-30 03:27:22', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: asd', NULL),
(11, 12, '2025-11-30 03:32:14', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: qwert', NULL),
(12, 13, '2025-11-30 03:33:36', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: za', NULL),
(13, 14, '2025-11-30 04:02:39', 'Initial Dispatch', 'Incident: Fire | Location: BGC Bonifacio Global City, Taguig | Narrative: Person experiencing chest pain - medical personnel standby', NULL),
(14, 15, '2025-11-30 04:03:17', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', NULL),
(15, 16, '2025-11-30 04:03:33', 'Initial Dispatch', 'Incident: Not specified | Location: 123 Main St, Barangay 1 | Narrative: No details', NULL),
(16, 17, '2025-11-30 04:22:41', 'Initial Dispatch', 'Incident: Not specified | Location: BGC Bonifacio Global City, Taguig | Narrative: No details', NULL),
(17, 18, '2025-11-30 04:23:29', 'Initial Dispatch', 'Incident: Not specified | Location: BGC Bonifacio Global City, Taguig | Narrative: hahahaha\n', NULL),
(18, 19, '2025-11-30 04:23:52', 'Initial Dispatch', 'Incident: Not specified | Location: Makati Avenue, Makati City | Narrative: what', NULL),
(19, 20, '2025-11-30 04:26:49', 'Initial Dispatch', 'Incident: Not specified | Location: Makati Avenue, Makati City | Narrative: zxc', NULL),
(20, 21, '2025-11-30 04:27:10', 'Initial Dispatch', 'Incident: Fire | Location: 123 Main St, Barangay 1 | Narrative: fire', NULL),
(21, 22, '2025-11-30 04:31:09', 'Initial Dispatch', 'Incident: Fire | Location: Makati Avenue, Makati City | Narrative: wews', NULL),
(22, 23, '2025-11-30 04:32:40', 'Initial Dispatch', 'Incident: Medical Emergency | Location: 123 Main St, Barangay 1 | Narrative: gago', NULL),
(23, 24, '2025-11-30 04:49:37', 'Initial Dispatch', 'Incident: Medical Emergency | Location: 123 Main St, Barangay 1 | Narrative: dfg', NULL),
(24, 25, '2025-11-30 04:50:03', 'Initial Dispatch', 'Incident: Fire | Location: 123 Main St, Barangay 1 | Narrative: dfg', NULL),
(25, 26, '2025-11-30 05:07:11', 'Initial Dispatch', 'Incident: Fire | Location: 123 Main St, Barangay 1 | Narrative: shet mainet', NULL),
(26, 27, '2025-11-30 06:09:16', 'Initial Dispatch', 'Incident: Fire | Location: 123 Main St, Barangay 1 | Narrative: cvb', NULL),
(27, 28, '2025-11-30 06:11:02', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', NULL),
(28, 29, '2025-11-30 11:28:16', 'Initial Dispatch', 'Incident: Fire | Location: BGC Bonifacio Global City, Taguig | Narrative: Person experiencing chest pain - medical personnel standby', NULL),
(29, 30, '2025-11-30 11:43:42', 'Initial Dispatch', 'Incident: Fire | Location: 123 Main St, Barangay 1 | Narrative: ads', 520),
(30, 31, '2025-11-30 11:56:11', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', NULL),
(31, 32, '2025-11-30 11:56:46', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed as', 520),
(32, 33, '2025-11-30 12:15:29', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', 520),
(33, 34, '2025-11-30 12:22:59', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', 520),
(34, 35, '2025-11-30 12:28:06', 'Initial Dispatch', 'Incident: Fire | Location: Manila City Hall, Manila | Narrative: Large fire at residential building - immediate response required', NULL),
(35, 36, '2025-11-30 12:28:50', 'Initial Dispatch', 'Incident: Fire | Location: Manila City Hall, Manila | Narrative: Large fire at residential building - immediate response required', NULL),
(36, 37, '2025-11-30 12:31:07', 'Initial Dispatch', 'Incident: Fire | Location: Manila City Hall, Manila | Narrative: Large fire at residential building - immediate response required', 519),
(37, 38, '2025-11-30 12:31:18', 'Initial Dispatch', 'Incident: Fire | Location: Manila City Hall, Manila | Narrative: Large fire at residential building - immediate response required', 520),
(38, 39, '2025-11-30 12:31:30', 'Initial Dispatch', 'Incident: Fire | Location: 14.5922, 121.0138 | Narrative: Large fire at residential building - immediate response required', 519),
(39, 40, '2025-11-30 12:41:39', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', 520),
(40, 41, '2025-11-30 13:09:40', 'Initial Dispatch', 'Incident: Fire | Location: BGC Bonifacio Global City, Taguig | Narrative: Person experiencing chest pain - medical personnel standby', 519),
(41, 42, '2025-11-30 13:11:26', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', 520),
(42, 43, '2025-11-30 14:12:12', 'Initial Dispatch', 'Incident: Fire | Location: Manila City Hall, Manila | Narrative: Large fire at residential building - immediate response required', 520),
(43, 44, '2025-11-30 15:45:41', 'Initial Dispatch', 'Incident: Fire | Location: BGC Bonifacio Global City, Taguig | Narrative: Person experiencing chest pain - medical personnel standby mar', 524),
(46, 47, '2025-11-30 15:50:07', 'Initial Dispatch', 'Incident: Fire | Location: 14.5868, 121.1553 | Narrative: Person experiencing chest pain - medical personnel standbyad', 524),
(49, 50, '2025-11-30 15:57:11', 'Initial Dispatch', 'Incident: Fire | Location: Manila City Hall, Manila | Narrative: Large fire at residential building - immediate response required bakit', 524),
(52, 53, '2025-11-30 15:58:56', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed', 523),
(55, 56, '2025-12-01 10:52:22', 'Initial Dispatch', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed welp', 523),
(56, 57, '2025-12-01 10:52:22', '', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed welp', NULL),
(57, 58, '2025-12-01 10:52:22', '', 'Incident: Medical Emergency | Location: Makati Avenue, Makati City | Narrative: Person trapped in vehicle after accident - rescue needed welp', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `firetrucks`
--

CREATE TABLE `firetrucks` (
  `truck_id` int(11) NOT NULL,
  `plate_number` varchar(20) NOT NULL,
  `model` varchar(50) DEFAULT NULL,
  `station_id` int(11) NOT NULL COMMENT 'FK to fire_stations',
  `driver_user_id` int(11) DEFAULT NULL COMMENT 'FK to users - who is currently driving',
  `current_latitude` decimal(10,8) DEFAULT NULL COMMENT 'Real-time location from firetruck tracking app',
  `current_longitude` decimal(11,8) DEFAULT NULL COMMENT 'Real-time location from firetruck tracking app',
  `last_location_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 0,
  `battery_level` int(11) DEFAULT NULL,
  `last_online` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('available','on_mission','offline') DEFAULT 'offline',
  `current_alarm_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `firetrucks`
--

INSERT INTO `firetrucks` (`truck_id`, `plate_number`, `model`, `station_id`, `driver_user_id`, `current_latitude`, `current_longitude`, `last_location_update`, `is_active`, `battery_level`, `last_online`, `status`, `current_alarm_id`) VALUES
(1, 'FT-ZAMB-001', 'Hino 500', 101, NULL, NULL, NULL, '2025-11-28 13:10:23', 0, NULL, '2025-12-01 13:55:27', 'offline', NULL),
(2, 'FT-ZAMB-002', 'Isuzu FVR', 102, NULL, NULL, NULL, '2025-11-28 13:10:23', 0, NULL, '2025-12-01 13:55:27', 'offline', NULL),
(3, 'FT-ZAMB-003', 'Fuso Fighter', 103, NULL, NULL, NULL, '2025-11-28 13:10:23', 0, NULL, '2025-12-01 13:55:27', 'offline', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fire_stations`
--

CREATE TABLE `fire_stations` (
  `station_id` int(11) NOT NULL,
  `station_name` varchar(100) NOT NULL,
  `province` varchar(50) NOT NULL,
  `city` varchar(50) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `is_ready` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=Ready to dispatch (Default), 0=Busy/Unavailable (Set by Substation Admin)',
  `last_status_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `station_type` enum('Main','Substation') NOT NULL DEFAULT 'Substation' COMMENT 'Main = Central fire station; Substation = branch fire station'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fire_stations`
--

INSERT INTO `fire_stations` (`station_id`, `station_name`, `province`, `city`, `contact_number`, `latitude`, `longitude`, `is_ready`, `last_status_update`, `station_type`) VALUES
(101, 'Central Fire Station', 'Zamboanga', 'Zamboanga City', NULL, 7.50000000, 122.00000000, 0, '2025-11-30 16:23:56', 'Main'),
(102, 'Central FSS FT 1', 'Zamboanga', 'Zamboanga City', '991226769588', 7.50100000, 122.00100000, 1, '2025-11-28 13:10:23', 'Substation'),
(103, 'Sta Catalina FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.51500000, 122.01500000, 0, '2025-12-01 10:53:12', 'Substation'),
(104, 'San Jose Gusu FSS FT', 'Zamboanga', 'Zamboanga City', '991226769588', 7.52000000, 122.02000000, 1, '2025-11-28 13:10:23', 'Substation');

-- --------------------------------------------------------

--
-- Table structure for table `station_readiness`
--

CREATE TABLE `station_readiness` (
  `readiness_id` int(11) NOT NULL,
  `station_id` int(11) NOT NULL,
  `submitted_by_user_id` int(11) DEFAULT NULL,
  `status` enum('READY','PARTIALLY_READY','NOT_READY') NOT NULL,
  `readiness_percentage` int(11) NOT NULL DEFAULT 0,
  `equipment_checklist` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'JSON object with firetruck, scba, hoses, radio, water, crew, oic, driver, generator checks' CHECK (json_valid(`equipment_checklist`)),
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `station_readiness`
--

INSERT INTO `station_readiness` (`readiness_id`, `station_id`, `submitted_by_user_id`, `status`, `readiness_percentage`, `equipment_checklist`, `submitted_at`) VALUES
(1, 101, 524, 'PARTIALLY_READY', 78, '{\"firetruck\":true,\"scba\":true,\"hoses\":true,\"radio\":true,\"water\":true,\"crew\":false,\"oic\":true,\"driver\":true,\"generator\":false}', '2025-11-30 16:23:56'),
(2, 103, 523, 'PARTIALLY_READY', 89, '{\"firetruck\":true,\"scba\":true,\"hoses\":false,\"radio\":true,\"water\":true,\"crew\":true,\"oic\":true,\"driver\":true,\"generator\":true}', '2025-11-30 16:24:31'),
(3, 103, 523, 'NOT_READY', 11, '{\"firetruck\":true,\"scba\":false,\"hoses\":false,\"radio\":false,\"water\":false,\"crew\":false,\"oic\":false,\"driver\":false,\"generator\":false}', '2025-12-01 10:53:12');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `id_number` varchar(20) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `rank` varchar(50) DEFAULT NULL,
  `substation` varchar(100) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('end_user','driver','admin','substation_admin') NOT NULL,
  `assigned_station_id` int(11) DEFAULT NULL COMMENT 'For drivers/admins, which station they belong to'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `id_number`, `first_name`, `last_name`, `rank`, `substation`, `full_name`, `phone_number`, `email`, `password`, `role`, `assigned_station_id`) VALUES
(201, NULL, NULL, NULL, NULL, NULL, 'End User Jane Doe', '9997778888', 'jane.doe@example.com', 'hashed_password_placeholder', 'end_user', NULL),
(205, 'BFP-00001', 'Admin', 'User', 'Chief Officer', 'Central Fire Station', 'Admin User', '9991234567', 'admin@bfp.gov.ph', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'admin', NULL),
(501, 'BFP-12345', 'Plain', 'Tester', NULL, 'Fire Station 3', 'Plain Text Tester', '9991234568', 'plain.test@bfp.gov', 'admin123', 'admin', NULL),
(502, 'BFP-00000', 'ern', 'natividad', 'FIRE OFFICER 1', '1', '', '', NULL, '$2b$10$NKYqyjluOX6nKBGGDXXHp.WC8GD021v/SxSXdxPpF8BDatzZSnohy', 'end_user', NULL),
(503, NULL, 'John', 'Doe', NULL, NULL, 'John Doe', '09171234567', 'caller_1764348079815@bfp.gov', 'temp_1764348079815', 'end_user', NULL),
(512, 'BFP-10000', 'ern', 'natividad', 'FIRE OFFICER 2', 'BFP Zamboanga City Station', 'ern natividad', 'signup_8390afc6-808', NULL, '$2b$10$JC2jerYDdXWkO4.l9vNqfOFPgkAF5MFwjokSFSpCRLa8TpFZdX/Qi', 'substation_admin', NULL),
(513, NULL, 'Pedro', 'Reyes', NULL, NULL, 'Pedro Reyes', '+63-919-876-5432', 'caller_1764475359338@bfp.gov', 'temp_1764475359338', 'end_user', NULL),
(514, NULL, 'Maria', 'Cruz', NULL, NULL, 'Maria Cruz', '+63-917-654-3210', 'caller_1764475397062@bfp.gov', 'temp_1764475397061', 'end_user', NULL),
(515, 'BFP-30000', 'Pedro', 'Reyes', 'FIRE OFFICER 1', NULL, 'Pedro Reyes', 'signup_3d42bc0d-78f', NULL, '$2b$10$FTFL9iGpSnDlCYYCv.iuCOe2NN8PO0DNZCkiBSnhqMNRVwPaWdcXK', 'substation_admin', NULL),
(516, 'BFP-20000', 'Maria', 'Zambales', 'FIRE OFFICER 1', NULL, 'Maria Zambales', 'signup_fe453b53-3df', NULL, '$2b$10$QznVH.uWY0zceGE8lcktm.tCXgVDjBwoCZguB.T14kwZJL3VSh5Bq', '', NULL),
(517, 'BFP-40000', 'Pedro', 'Reyes', 'FIRE OFFICER 2', NULL, 'Pedro Reyes', 'signup_92309f89-4b9', NULL, '$2b$10$NRNs.hNJYFeqG10eAwjG6uCJAKLGaupUcDI0v9FEhLhhUwOSTb.eG', 'substation_admin', NULL),
(518, 'BFP-00002', 'mark', 'tahimik', 'FIRE OFFICER 1', NULL, 'mark tahimik', 'signup_8a750343-081', NULL, '$2b$10$6eIr1b8mIV6Du9qGwfkvN.BViesQ5yhwrpsowYe1xRGy4HPeA4p5G', '', NULL),
(519, 'BFP-00003', 'mark', 'tahimik', 'FIRE OFFICER 1', NULL, 'mark tahimik', 'signup_0536bb21-7a4', NULL, '$2b$10$HLpv/MNr6ELmxQrltsFOzOP.i35b0oMxAl5JLJ4NNnYle5MMhXm6O', 'substation_admin', NULL),
(520, 'BFP-00005', 'ern', 'natividad', 'FIRE OFFICER 2', NULL, 'ern natividad', 'signup_322b33d4-3f6', NULL, '$2b$10$HcSc8sDL3SEG47wIyFPGN.mUhk5NdCU9t46I08Bi1zoeUEslHywja', 'admin', 101),
(521, NULL, 'Juan', 'Santos', NULL, NULL, 'Juan Santos', '+63-921-234-5678', 'caller_1764505686588@bfp.gov', 'temp_1764505686588', 'end_user', NULL),
(522, 'devadmin01', 'Dev', 'User', 'Captain', NULL, 'Dev User', 'signup_82a9b023-331', NULL, '$2b$10$4lOJ5jdJ1WWTZ7ZjGuK/WOreYa1Pu9E4LCPqYXKk/V7scxLhtJBGK', 'end_user', NULL),
(523, 'BFP-00012', 'Maria', 'Doe', 'FIRE OFFICER 1', NULL, 'Maria Doe', 'signup_1239ce47-d22', NULL, '$2b$10$c06joYx2nbDnDqc7YskyKOAkWBXgQsoJcmWwG8sDg6AgNg.78xyiG', 'substation_admin', 103),
(524, 'BFP-00013', 'ern', 'Reyes', 'FIRE OFFICER 2', NULL, 'ern Reyes', 'signup_7af36c32-986', NULL, '$2b$10$rLP8Cb3nS.xvYk.QT/5lluiMkEZ6l.kZiesR29r7BuBCGuS4ocFS.', 'admin', 101);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alarms`
--
ALTER TABLE `alarms`
  ADD PRIMARY KEY (`alarm_id`),
  ADD KEY `end_user_id` (`end_user_id`),
  ADD KEY `dispatched_station_id` (`dispatched_station_id`),
  ADD KEY `dispatched_truck_id` (`dispatched_truck_id`);

--
-- Indexes for table `alarm_response_log`
--
ALTER TABLE `alarm_response_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `alarm_id` (`alarm_id`),
  ADD KEY `performed_by_user_id` (`performed_by_user_id`);

--
-- Indexes for table `firetrucks`
--
ALTER TABLE `firetrucks`
  ADD PRIMARY KEY (`truck_id`),
  ADD UNIQUE KEY `plate_number` (`plate_number`),
  ADD KEY `station_id` (`station_id`),
  ADD KEY `driver_user_id` (`driver_user_id`),
  ADD KEY `fk_firetrucks_alarm` (`current_alarm_id`);

--
-- Indexes for table `fire_stations`
--
ALTER TABLE `fire_stations`
  ADD PRIMARY KEY (`station_id`);

--
-- Indexes for table `station_readiness`
--
ALTER TABLE `station_readiness`
  ADD PRIMARY KEY (`readiness_id`),
  ADD UNIQUE KEY `unique_latest_per_station` (`station_id`,`submitted_at`),
  ADD KEY `submitted_by_user_id` (`submitted_by_user_id`),
  ADD KEY `idx_station_id` (`station_id`),
  ADD KEY `idx_submitted_at` (`submitted_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `phone_number` (`phone_number`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `id_number` (`id_number`),
  ADD KEY `assigned_station_id` (`assigned_station_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alarms`
--
ALTER TABLE `alarms`
  MODIFY `alarm_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT for table `alarm_response_log`
--
ALTER TABLE `alarm_response_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `firetrucks`
--
ALTER TABLE `firetrucks`
  MODIFY `truck_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `fire_stations`
--
ALTER TABLE `fire_stations`
  MODIFY `station_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `station_readiness`
--
ALTER TABLE `station_readiness`
  MODIFY `readiness_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=525;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `alarms`
--
ALTER TABLE `alarms`
  ADD CONSTRAINT `alarms_ibfk_1` FOREIGN KEY (`end_user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `alarms_ibfk_2` FOREIGN KEY (`dispatched_station_id`) REFERENCES `fire_stations` (`station_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `alarms_ibfk_3` FOREIGN KEY (`dispatched_truck_id`) REFERENCES `firetrucks` (`truck_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `alarm_response_log`
--
ALTER TABLE `alarm_response_log`
  ADD CONSTRAINT `alarm_response_log_ibfk_1` FOREIGN KEY (`alarm_id`) REFERENCES `alarms` (`alarm_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `alarm_response_log_ibfk_2` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `firetrucks`
--
ALTER TABLE `firetrucks`
  ADD CONSTRAINT `firetrucks_ibfk_1` FOREIGN KEY (`station_id`) REFERENCES `fire_stations` (`station_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `firetrucks_ibfk_2` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_firetrucks_alarm` FOREIGN KEY (`current_alarm_id`) REFERENCES `alarms` (`alarm_id`) ON DELETE SET NULL;

--
-- Constraints for table `station_readiness`
--
ALTER TABLE `station_readiness`
  ADD CONSTRAINT `station_readiness_ibfk_1` FOREIGN KEY (`station_id`) REFERENCES `fire_stations` (`station_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `station_readiness_ibfk_2` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`assigned_station_id`) REFERENCES `fire_stations` (`station_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
