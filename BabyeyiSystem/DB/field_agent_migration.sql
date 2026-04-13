-- Field Agent role + profile table (also auto-created by API on first use)
-- Run manually if you prefer migrations outside the app.

INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
SELECT 'Field Agent', 'AGENT', 'Regional field coverage for schools and fees', '[]', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE UPPER(role_code) = 'AGENT' LIMIT 1);

CREATE TABLE IF NOT EXISTS field_agent_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  province VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  all_sectors TINYINT(1) NOT NULL DEFAULT 0,
  sectors_json JSON NOT NULL,
  national_id VARCHAR(64) DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fap_user (user_id),
  KEY idx_fap_district (district),
  KEY idx_fap_province (province),
  CONSTRAINT fk_fap_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
