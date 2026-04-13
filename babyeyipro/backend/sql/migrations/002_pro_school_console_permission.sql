-- Optional permission: full school console in Pro manager without relying on Pro plan alone.
-- Pro schools still get access via schools.pro_access_effective (see computeProAccessEffective).

INSERT IGNORE INTO permissions (permission_key, description) VALUES
  ('pro.school_console.access', 'Access full school console (Lite toolkit) in Pro manager');

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, 'pro.school_console.access'
FROM roles r
WHERE r.role_code IN ('SCHOOL_MANAGER', 'SCHOOL_ADMIN');
