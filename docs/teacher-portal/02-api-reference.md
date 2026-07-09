# Teacher Portal — API Reference

All paths below are relative to the API base (`/api` in dev via Vite proxy).

**Auth:** Session cookie unless noted. Most teacher-portal routes use `requireTeacherRole` (session required; role enforced primarily on frontend).

---

## Authentication & session

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | `identifier`, `password`, optional `schoolCode` |
| POST | `/auth/sso-verify` | Public | Exchange `sso_token` for session |
| GET | `/session/me` | Session | Current user + role |
| POST | `/session/logout` | Session | End session |
| POST | `/auth/profile/photo` | Session | Upload profile photo |

---

## Core (`/teacher-portal`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Dashboard aggregates |
| GET | `/students` | Students for teacher’s classes |
| GET | `/classes` | Class list |
| GET | `/timetable` | Teacher timetable |
| GET | `/timetable-filters` | Filter options for timetable UI |
| GET | `/english-club/resources` | English Club content |

---

## Attendance (legacy timetable-based)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance` | Load attendance for period |
| POST | `/attendance` | Save attendance records |
| GET | `/attendance-summary/daily` | Daily summary |
| GET | `/attendance-summary/weekly` | Weekly summary |
| GET | `/teacher-attendance` | Teacher attendance log |
| POST | `/teacher-attendance` | Record teacher attendance |

---

## Attendance module (expanded)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance-module/meta` | Module metadata |
| GET | `/attendance-module/class-period` | Class period attendance |
| POST | `/attendance-module/class-period` | Save class period attendance |
| GET | `/attendance-module/student-entry-exit` | Student gate logs |
| POST | `/attendance-module/student-entry-exit/simulate-scan` | Simulate gate scan |
| GET | `/attendance-module/student-entry-exit/monthly-grid` | Monthly student grid |
| GET | `/attendance-module/teacher` | Teacher gate logs |
| GET | `/attendance-module/teacher/monthly-grid` | Teacher monthly grid |
| POST | `/attendance-module/teacher/manual` | Manual teacher entry |
| POST | `/attendance-module/teacher/simulate-scan` | Simulate teacher scan |
| GET | `/attendance-module/teacher-class-checkin` | Class check-in state |
| POST | `/attendance-module/teacher-class-checkin/simulate-scan` | QR check-in |
| POST | `/attendance-module/teacher-class-checkin/override` | Manual override |
| GET | `/attendance-module/parent-notifications` | Parent notification queue |
| POST | `/attendance-module/parent-notifications/enqueue` | Enqueue parent alert |

---

## Round roll call

| Method | Path | Description |
|--------|------|-------------|
| GET | `/round-roll-call/sessions` | Past sessions |
| GET | `/round-roll-call` | Session detail |
| POST | `/round-roll-call` | Create/update session |

---

## Classroom QR / period tracking

| Method | Path | Description |
|--------|------|-------------|
| GET | `/class-period/active` | Active period |
| GET | `/class-period/history` | History |
| GET | `/upcoming-lesson` | Next lesson |
| POST | `/class-room/scan` | Process QR scan payload |

---

## Marks & gradebook

| Method | Path | Description |
|--------|------|-------------|
| GET | `/gradebook-filters` | Filters (class, subject, term) |
| GET | `/gradebook-matrix` | Gradebook matrix |
| GET | `/gradebook-assessments` | Assessments list |
| POST | `/assessments` | Create assessment |
| POST | `/marks` | Save marks (legacy) |
| GET | `/teaching-assignments` | Teacher’s teaching assignments |
| GET | `/assessment-types` | Assessment type catalog |
| GET | `/assessment-context` | Context for mark entry |
| POST | `/register-marks` | Register marks (bulk) |
| GET | `/marks-center` | Marks center grid data |
| GET | `/marks-analytics` | Analytics |
| PATCH | `/marks-cell` | Update single cell |
| GET | `/competency-categories` | CBC categories |
| GET | `/competency-ratings` | Load ratings |
| POST | `/competency-ratings` | Save ratings |
| GET | `/examination-list` | Examination eligibility |

---

## Payroll

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff/payroll/my` | Teacher’s payroll summary / net salary |

---

## USSD Avance (separate bearer auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/avance/ussd/login` | Public | Phone/staff code login → bearer token |
| POST | `/avance/ussd/cashout-request` | Bearer | Create cashout |
| GET | `/avance/ussd/requests` | Bearer | List requests |

Full USSD guide: [../teacher-avance-ussd-api.md](../teacher-avance-ussd-api.md)

---

## Portal operations (`portalOperations.js`)

Mounted under `/api/teacher-portal` with stricter `requireRole`.

| Method | Path | Roles (typical) |
|--------|------|-----------------|
| GET | `/requisitions` | TEACHER, HOD, DOS, ACCOUNTANT, SCHOOL_ADMIN, SCHOOL_MANAGER |
| POST | `/requisitions` | TEACHER, HOD, DOS |
| PATCH | `/requisitions/:id` | TEACHER, HOD, DOS |
| DELETE | `/requisitions/:id` | TEACHER, HOD, DOS |
| GET | `/inventory-equipment` | Read roles above |
| GET | `/permissions` | TEACHER, HOD, DOS |
| POST | `/permissions` | TEACHER, HOD, DOS |
| DELETE | `/permissions/:id` | TEACHER, HOD, DOS |

Permission approval (DOS/admin):

| Method | Path |
|--------|------|
| GET | `/api/reports/teacher-permissions` |
| PATCH | `/api/reports/teacher-permissions/:id/action` |

---

## Related APIs (other mounts)

| Prefix | Used for |
|--------|----------|
| `/api/services/shule-avance/*` | TichaAvance, TichaDeals |
| `/api/procurement/*` | Purchase requests |
| `/api/chat/*` | Staff chat |
| `/api/tools/ticha-ai/*` | TichaAI |
| `/api/dos/*` | Subjects, registry classes |
| `/api/school/calendar-events` | School calendar |
| `/api/locations/*` | Rwanda location picker (deals) |

---

## Response conventions

Typical success shape:

```json
{
  "success": true,
  "data": { },
  "message": "optional"
}
```

Errors:

| Status | Meaning |
|--------|---------|
| 401 | No session or expired |
| 403 | Role not allowed |
| 400 | Validation error |
| 500 | Server error |

Frontend `api.js` redirects to `/login` on 401 (except when already on login page).

---

## Rate limiting

Polling endpoints (timetable, attendance summaries, attendance-module meta/class-period) are exempt from anonymous rate limits in `server.js`. Keep new high-frequency polls on this exemption list if needed.
