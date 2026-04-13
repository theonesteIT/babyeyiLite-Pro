-- Babyeyi — Student / voucher services catalog & orders
-- Run on existing `babyeyi` (or your DB_NAME) after backup.
-- Compatible with MariaDB 10.4+ / MySQL 8+

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `services` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_code` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'Voucher',
  `description` text DEFAULT NULL,
  `short_tagline` varchar(500) DEFAULT NULL COMMENT 'Card subtitle / benefit line',
  `icon_url` varchar(512) DEFAULT NULL,
  `academic_year` varchar(32) NOT NULL COMMENT 'e.g. 2026-2027',
  `eligibility_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of levels' CHECK (json_valid(`eligibility_levels`)),
  `default_pricing_type` enum('global','by_level','by_school') NOT NULL DEFAULT 'global',
  `validity_start` date DEFAULT NULL,
  `validity_end` date DEFAULT NULL,
  `redemption_method` varchar(255) DEFAULT NULL,
  `delivery_method` varchar(255) DEFAULT NULL,
  `stock_quantity` int(11) DEFAULT NULL COMMENT 'NULL = unlimited',
  `payment_rules` text DEFAULT NULL,
  `terms_conditions` text DEFAULT NULL,
  `status` enum('draft','active','inactive','archived') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_services_code` (`service_code`),
  KEY `idx_services_status_year` (`status`,`academic_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_prices` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` int(10) UNSIGNED NOT NULL,
  `pricing_type` enum('global','level','school') NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `level` varchar(64) DEFAULT NULL COMMENT 'Nursery, Primary, O''Level, etc.',
  `academic_year` varchar(32) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'FRW',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sp_service` (`service_id`),
  KEY `idx_sp_school` (`school_id`),
  KEY `idx_sp_year` (`academic_year`),
  CONSTRAINT `fk_sp_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_orders` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` varchar(40) NOT NULL,
  `service_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED DEFAULT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'parent_portal_accounts.id',
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `academic_year` varchar(32) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'FRW',
  `payment_status` enum('pending','awaiting_payment','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `order_status` enum('pending','awaiting_payment','paid','voucher_issued','redeemed','cancelled','expired') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_number` (`order_number`),
  KEY `idx_so_service` (`service_id`),
  KEY `idx_so_student` (`student_id`),
  KEY `idx_so_parent` (`parent_id`),
  KEY `idx_so_school` (`school_id`),
  CONSTRAINT `fk_so_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_payments` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` int(10) UNSIGNED NOT NULL,
  `payment_ref` varchar(128) DEFAULT NULL,
  `payment_method` varchar(64) DEFAULT NULL,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transaction_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_date` datetime DEFAULT NULL,
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `provider_response` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pay_order` (`order_id`),
  CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `voucher_code` varchar(48) NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED DEFAULT NULL,
  `service_id` int(10) UNSIGNED NOT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('pending','paid','redeemed','expired','cancelled') NOT NULL DEFAULT 'pending',
  `qr_code_path` varchar(512) DEFAULT NULL,
  `redeemed_at` datetime DEFAULT NULL,
  `redeemed_by` int(10) UNSIGNED DEFAULT NULL COMMENT 'users.id',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_voucher_code` (`voucher_code`),
  KEY `idx_v_order` (`order_id`),
  KEY `idx_v_service` (`service_id`),
  KEY `idx_v_student` (`student_id`),
  CONSTRAINT `fk_v_order` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_v_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `voucher_redemptions` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `voucher_id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `redeemed_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `redeemed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vr_voucher` (`voucher_id`),
  KEY `idx_vr_school` (`school_id`),
  CONSTRAINT `fk_vr_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
