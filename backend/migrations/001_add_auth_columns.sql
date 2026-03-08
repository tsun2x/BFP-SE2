-- Update users table to support authentication with ID numbers

-- Alter existing users table to add new columns needed for authentication
ALTER TABLE `users` ADD COLUMN `id_number` VARCHAR(20) UNIQUE AFTER `user_id`;
ALTER TABLE `users` ADD COLUMN `first_name` VARCHAR(50) AFTER `id_number`;
ALTER TABLE `users` ADD COLUMN `last_name` VARCHAR(50) AFTER `first_name`;
ALTER TABLE `users` ADD COLUMN `rank` VARCHAR(50) AFTER `last_name`;
ALTER TABLE `users` ADD COLUMN `substation` VARCHAR(100) AFTER `rank`;
ALTER TABLE `users` MODIFY COLUMN `password_hash` VARCHAR(255) NOT NULL;
ALTER TABLE `users` CHANGE COLUMN `password_hash` `password` VARCHAR(255) NOT NULL;

-- Create some sample users for testing
-- Insert sample users only if their phone number does not already exist
INSERT INTO `users` (`id_number`, `first_name`, `last_name`, `rank`, `substation`, `full_name`, `email`, `password`, `role`, `assigned_station_id`, `phone_number`)
SELECT 'BFP-00001', 'Admin', 'User', 'Chief Officer', 'Central Fire Station', 'Admin User', 'admin@bfp.gov.ph', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'admin', NULL, '9991234567'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `phone_number` = '9991234567');

INSERT INTO `users` (`id_number`, `first_name`, `last_name`, `rank`, `substation`, `full_name`, `email`, `password`, `role`, `assigned_station_id`, `phone_number`)
SELECT 'BFP-00002', 'John', 'Doe', 'Fire Officer 1', 'Central FSS FT 1', 'John Doe', 'john@bfp.gov.ph', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'substation_admin', 102, '9995556666'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `phone_number` = '9995556666');

INSERT INTO `users` (`id_number`, `first_name`, `last_name`, `rank`, `substation`, `full_name`, `email`, `password`, `role`, `assigned_station_id`, `phone_number`)
SELECT 'BFP-00003', 'Jane', 'Smith', 'Fire Officer 2', 'Sta Catalina FSS FT', 'Jane Smith', 'jane@bfp.gov.ph', '$2b$10$6TsYzHd0rJnIeH3YdHFPSu8L9qF1jQ.QT8tLQ8vQlF3Ps0JZSgxky', 'driver', 103, '9997778888'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `phone_number` = '9997778888');
