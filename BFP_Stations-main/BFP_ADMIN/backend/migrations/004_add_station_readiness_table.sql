-- Add station readiness tracking table
CREATE TABLE IF NOT EXISTS `station_readiness` (
  `readiness_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `station_id` INT NOT NULL,
  `submitted_by_user_id` INT NULL,
  `status` ENUM('READY', 'PARTIALLY_READY', 'NOT_READY') NOT NULL,
  `readiness_percentage` INT NOT NULL DEFAULT 0,
  `equipment_checklist` JSON NOT NULL COMMENT 'JSON object with firetruck, scba, hoses, radio, water, crew, oic, driver, generator checks',
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`station_id`) REFERENCES `fire_stations`(`station_id`) ON DELETE CASCADE,
  FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_station_id` (`station_id`),
  INDEX `idx_submitted_at` (`submitted_at`),
  UNIQUE KEY `unique_latest_per_station` (`station_id`, `submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
