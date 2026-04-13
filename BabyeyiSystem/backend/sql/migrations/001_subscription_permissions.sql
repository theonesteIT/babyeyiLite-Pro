-- =============================================================================
-- Master DB (babyeyi): subscription, module access, granular permissions
-- Run once against babyeyi.
--
-- Note: `schools` already has a `status` column used for registration workflow.
--       New column `school_status` controls active / inactive / suspended for access.
-- =============================================================================

ALTER TABLE schools ADD COLUMN subscription_plan ENUM('lite','pro') NOT NULL DEFAULT 'lite';
ALTER TABLE schools ADD COLUMN pro_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE schools ADD COLUMN pro_start_date DATETIME NULL DEFAULT NULL;
ALTER TABLE schools ADD COLUMN pro_end_date DATETIME NULL DEFAULT NULL;
ALTER TABLE schools ADD COLUMN school_status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS school_module_access (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id INT UNSIGNED NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_school_module (school_id, module_key),
  KEY idx_school_module_access_school (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL DEFAULT NULL,
  UNIQUE KEY uq_permission_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_role_perm (role_id, permission_key),
  KEY idx_role_permissions_role (role_id),
  KEY idx_role_permissions_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO permissions (permission_key, description) VALUES
  ('lite.dashboard.view', 'View Lite dashboard'),
  ('pro.dashboard.view', 'View Pro dashboard sections'),
  ('pro.attendance.view', 'View Pro attendance'),
  ('pro.attendance.manage', 'Manage Pro attendance'),
  ('pro.marks.view', 'View marks'),
  ('pro.marks.manage', 'Manage marks'),
  ('pro.timetable.view', 'View timetable'),
  ('pro.timetable.manage', 'Manage timetable'),
  ('pro.teacher_ai.use', 'Use teacher AI tools'),
  ('pro.iot.view', 'View IoT / biometric'),
  ('pro.student_permissions.manage', 'Manage student permissions');

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key
FROM roles r
CROSS JOIN (
  SELECT 'lite.dashboard.view' AS permission_key UNION ALL
  SELECT 'pro.dashboard.view' UNION ALL
  SELECT 'pro.attendance.view' UNION ALL
  SELECT 'pro.attendance.manage' UNION ALL
  SELECT 'pro.marks.view' UNION ALL
  SELECT 'pro.marks.manage' UNION ALL
  SELECT 'pro.timetable.view' UNION ALL
  SELECT 'pro.timetable.manage'
) p
WHERE r.role_code IN ('SCHOOL_MANAGER', 'SCHOOL_ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key
FROM roles r
CROSS JOIN (
  SELECT 'lite.dashboard.view' AS permission_key UNION ALL
  SELECT 'pro.dashboard.view' UNION ALL
  SELECT 'pro.attendance.view' UNION ALL
  SELECT 'pro.attendance.manage' UNION ALL
  SELECT 'pro.marks.view' UNION ALL
  SELECT 'pro.marks.manage' UNION ALL
  SELECT 'pro.timetable.view' UNION ALL
  SELECT 'pro.timetable.manage'
) p
WHERE r.role_code = 'DOS';

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key
FROM roles r
CROSS JOIN (
  SELECT 'lite.dashboard.view' AS permission_key UNION ALL
  SELECT 'pro.dashboard.view' UNION ALL
  SELECT 'pro.attendance.view' UNION ALL
  SELECT 'pro.marks.view' UNION ALL
  SELECT 'pro.timetable.view'
) p
WHERE r.role_code IN ('TEACHER', 'HOD');

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, 'lite.dashboard.view'
FROM roles r
WHERE r.role_code = 'ACCOUNTANT';

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key
FROM roles r
CROSS JOIN permissions p
WHERE r.role_code IN ('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER');
