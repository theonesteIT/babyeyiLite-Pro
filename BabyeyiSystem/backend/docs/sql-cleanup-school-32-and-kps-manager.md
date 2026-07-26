# SQL scripts — School 32 cleanup & Kigali Parent's School manager

Run these in **MySQL** (phpMyAdmin, MySQL Workbench, or CLI).  
**Back up the database before running any destructive script.**

---

## School reference

| Item | Value |
|------|--------|
| Cleanup school ID | `32` |
| KPS school code | `04004` |
| KPS school name | KIGALI PARENT'S SCHOOL |
| Head teacher | Buzaale Gershom |
| Manager login email | `kparentsschool@yahoo.com` |
| Manager password | `kparentsschool@` |

---

## Part A — Preview (school 32)

```sql
-- Payroll runs to delete
SELECT id, run_period, status, pay_month, pay_year, staff_count, created_at
FROM accountant_payroll_runs
WHERE school_id = 32
ORDER BY id DESC;

-- Employee kept (HR cleanup)
SELECT u.id, u.email, u.first_name, u.last_name, st.staff_id, st.full_name
FROM users u
LEFT JOIN staff st ON st.user_id = u.id AND st.school_id = 32
WHERE u.school_id = 32
  AND LOWER(u.email) = 'kigalips2025@gmail.com'
  AND u.deleted_at IS NULL;

-- Employees that will be removed from HR
SELECT u.id, u.email, u.first_name, u.last_name, st.staff_id, st.full_name
FROM staff st
INNER JOIN users u ON u.id = st.user_id
WHERE st.school_id = 32
  AND u.deleted_at IS NULL
  AND LOWER(u.email) <> 'kigalips2025@gmail.com';
```

---

## Part B — Delete ALL payroll runs (school 32, paid + non-paid)

```sql
START TRANSACTION;

DELETE FROM accountant_payroll_disbursement_deduction_applications
WHERE school_id = 32;

DELETE FROM accountant_payroll_run_lines
WHERE school_id = 32;

DELETE FROM accountant_payroll_runs
WHERE school_id = 32;

COMMIT;
```

### Verify

```sql
SELECT COUNT(*) AS remaining_runs
FROM accountant_payroll_runs
WHERE school_id = 32;

SELECT COUNT(*) AS remaining_lines
FROM accountant_payroll_run_lines
WHERE school_id = 32;
```

Both counts should be **0**.

> **Note:** This removes payroll **run** history only. It does not delete `payroll_requests` or `accountant_payroll_payments`.

---

## Part C — Remove all HR employees except `kigalips2025@gmail.com` (school 32)

```sql
START TRANSACTION;

SET @keep_user_id := (
  SELECT u.id
  FROM users u
  WHERE u.school_id = 32
    AND LOWER(u.email) = 'kigalips2025@gmail.com'
    AND u.deleted_at IS NULL
  LIMIT 1
);

SELECT @keep_user_id AS keep_user_id;

DELETE FROM hr_leave_requests
WHERE school_id = 32
  AND staff_user_id <> IFNULL(@keep_user_id, 0);

DELETE FROM hr_leave_balances
WHERE school_id = 32
  AND staff_user_id <> IFNULL(@keep_user_id, 0);

DELETE FROM accountant_payroll_staff_overrides
WHERE school_id = 32
  AND user_id <> IFNULL(@keep_user_id, 0);

DELETE FROM staff_portal_notifications
WHERE school_id = 32
  AND user_id <> IFNULL(@keep_user_id, 0);

DELETE st
FROM staff st
INNER JOIN users u ON u.id = st.user_id
WHERE st.school_id = 32
  AND u.deleted_at IS NULL
  AND u.id <> IFNULL(@keep_user_id, 0);

UPDATE users u
SET u.deleted_at = NOW(),
    u.is_active = 0,
    u.updated_at = NOW()
WHERE u.school_id = 32
  AND u.deleted_at IS NULL
  AND LOWER(u.email) <> 'kigalips2025@gmail.com';

COMMIT;
```

### Verify

```sql
SELECT u.id, u.email, u.first_name, u.last_name, st.staff_id
FROM staff st
INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
WHERE st.school_id = 32;
```

Should show only **kigalips2025@gmail.com** (if that account exists).

---

## Part D — Create / link school manager for school code `04004`

**Kigali Parent's School** — manager login from the Edit School form:

- Email: `kparentsschool@yahoo.com`
- Password: `kparentsschool@`
- Head teacher name: **Buzaale Gershom**
- Role used by the app: `SCHOOL_ADMIN` (falls back to `SCHOOL_MANAGER`)

Password hash below was generated with `bcrypt` (cost **12**), same as school registration:

```
$2b$12$GL6ZRC.SBAmMRYCDt5iXYuVTFzVelj5r8t4Sql9kqbY9423bGxukm
```

### D.1 Preview — confirm school exists

```sql
SELECT id, school_name, school_code, email, head_teacher_name,
       manager_user_id, admin_id, status, is_active
FROM schools
WHERE school_code = '04004'
  AND deleted_at IS NULL;
```

### D.2 Create or update manager account and link to school

```sql
START TRANSACTION;

SET @school_code      := '04004';
SET @mgr_email        := 'kparentsschool@yahoo.com';
SET @password_hash    := '$2b$12$GL6ZRC.SBAmMRYCDt5iXYuVTFzVelj5r8t4Sql9kqbY9423bGxukm';
SET @first_name       := 'Buzaale';
SET @last_name        := 'Gershom';
SET @head_teacher     := 'Buzaale Gershom';
SET @user_uid         := CONCAT('SM-04004-', LPAD(FLOOR(RAND() * 1000000), 6, '0'));

SELECT id INTO @school_id
FROM schools
WHERE school_code = @school_code
  AND deleted_at IS NULL
LIMIT 1;

SELECT id INTO @role_id
FROM roles
WHERE role_code IN ('SCHOOL_ADMIN', 'SCHOOL_MANAGER')
  AND is_active = 1
ORDER BY FIELD(role_code, 'SCHOOL_ADMIN', 'SCHOOL_MANAGER')
LIMIT 1;

SELECT id INTO @existing_mgr_id
FROM users
WHERE LOWER(email) = LOWER(@mgr_email)
  AND deleted_at IS NULL
LIMIT 1;

-- Stop here manually if @school_id or @role_id is NULL
SELECT @school_id AS school_id, @role_id AS role_id, @existing_mgr_id AS existing_mgr_id;

-- Update school profile fields (optional but matches your form)
UPDATE schools
SET head_teacher_name = @head_teacher,
    email             = @mgr_email,
    phone             = '+250 782 859 121',
    province          = 'Kigali City',
    district          = 'Gasabo',
    sector            = 'Kimironko',
    school_category   = 'Day',
    ownership_type    = 'Private',
    status            = 'active',
    is_active         = 1,
    updated_at        = NOW()
WHERE id = @school_id;

-- Existing manager user → reset password + link
UPDATE users
SET role_id              = @role_id,
    school_id              = @school_id,
    first_name             = @first_name,
    last_name              = @last_name,
    password_hash          = @password_hash,
    province               = 'Kigali City',
    district               = 'Gasabo',
    sector                 = 'Kimironko',
    is_active              = 1,
    is_verified            = 1,
    force_password_change  = 0,
    failed_login_attempts  = 0,
    is_locked              = 0,
    locked_until           = NULL,
    deleted_at             = NULL,
    updated_at             = NOW()
WHERE id = @existing_mgr_id;

SET @manager_id := @existing_mgr_id;

-- No user yet → create manager account
INSERT INTO users (
  user_uid, username, email, password_hash,
  first_name, last_name,
  role_id, school_id,
  province, district, sector,
  is_active, is_verified, force_password_change,
  created_at, updated_at
)
SELECT
  @user_uid,
  @mgr_email,
  @mgr_email,
  @password_hash,
  @first_name,
  @last_name,
  @role_id,
  @school_id,
  'Kigali City',
  'Gasabo',
  'Kimironko',
  1,
  1,
  0,
  NOW(),
  NOW()
FROM DUAL
WHERE @manager_id IS NULL
  AND @school_id IS NOT NULL
  AND @role_id IS NOT NULL;

SET @manager_id := COALESCE(@manager_id, LAST_INSERT_ID());

-- Link manager to school (required for login)
UPDATE schools
SET manager_user_id = @manager_id,
    admin_id        = COALESCE(admin_id, @manager_id),
    updated_at      = NOW()
WHERE id = @school_id;

COMMIT;
```

### D.3 Verify manager login link

```sql
SELECT
  s.id AS school_id,
  s.school_code,
  s.school_name,
  s.head_teacher_name,
  s.manager_user_id,
  u.id AS user_id,
  u.email AS login_email,
  u.first_name,
  u.last_name,
  r.role_code,
  u.is_active,
  u.deleted_at
FROM schools s
LEFT JOIN users u ON u.id = s.manager_user_id
LEFT JOIN roles r ON r.id = u.role_id
WHERE s.school_code = '04004'
  AND s.deleted_at IS NULL;
```

Expected:

- `login_email` = `kparentsschool@yahoo.com`
- `role_code` = `SCHOOL_ADMIN` or `SCHOOL_MANAGER`
- `manager_user_id` = user `id`
- `is_active` = 1, `deleted_at` = NULL

### D.4 Login test

Use the public login page with:

- **Email:** `kparentsschool@yahoo.com`
- **Password:** `kparentsschool@`

---

## Optional — Regenerate password hash

If you change the password, generate a new bcrypt hash:

```bash
cd BabyeyiSystem/backend
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('YOUR_NEW_PASSWORD', 12).then(h=>console.log(h));"
```

Replace `@password_hash` in Part D with the output.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| `@school_id` is NULL | School code `04004` does not exist — create the school in Super Admin first |
| `@role_id` is NULL | Run role seed / `INSERT INTO roles` for `SCHOOL_ADMIN` |
| Email already used by another school | Change email or soft-delete the conflicting `users` row |
| Manager cannot log in | Confirm `schools.manager_user_id = users.id` and `users.school_id = schools.id` |
| Part C `@keep_user_id` is NULL | Account `kigalips2025@gmail.com` not found at school 32 — create it first or skip Part C |

---

## Files

- App school registration logic: `BabyeyiSystem/backend/BabyeyiRoutes/school-add.js`
- Manager credentials API: `BabyeyiSystem/backend/authPages/auth.js` (`PATCH /api/auth/schools/:schoolId/manager-credentials`)
