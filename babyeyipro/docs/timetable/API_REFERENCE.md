# Timetable API Reference

Base URL: `/api`

Main backend file: `BabyeyiSystem/backend/BabyeyiRoutes/dosAcademic.js`

## Core timetable CRUD

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dos/timetable` | List timetable rows (filters: class, teacher, day, term, year) |
| POST | `/dos/timetable` | Create timetable row (teacher clash checks) |
| PUT | `/dos/timetable/:id` | Update row (same clash checks) |
| DELETE | `/dos/timetable/:id` | Delete row |
| GET | `/dos/dashboard/today-timetable` | Today timetable summary for dashboard |

## Smart timetable system

| Method | Endpoint |
|---|---|
| GET/PUT | `/dos/timetable-system/schedule` |
| GET/PUT | `/dos/timetable-system/teacher-profiles` |
| GET/PUT | `/dos/timetable-system/course-config/:subjectName` |
| GET | `/dos/timetable-system/assignments` |
| POST | `/dos/timetable-system/assignments` |
| POST | `/dos/timetable-system/assignments/bulk` |
| PUT/DELETE | `/dos/timetable-system/assignments/:id` |
| GET | `/dos/timetable-system/extra-activities` |
| POST | `/dos/timetable-system/extra-activities/validate` |
| POST/PUT/DELETE | `/dos/timetable-system/extra-activities...` |
| GET | `/dos/timetable-system/workload` |
| POST | `/dos/timetable-system/generate` |
| POST | `/dos/timetable-system/apply` |
| POST | `/dos/timetable-system/regenerate` |
| POST | `/dos/timetable-system/clear-timetables` |
| GET | `/dos/timetable-system/class-coverage` |
| GET | `/dos/timetable-system/conflict-center` |
| POST | `/dos/timetable-system/auto-fix` |
| POST | `/dos/timetable-system/check-conflicts` |

## Teacher assignments (source of truth)

| Method | Endpoint |
|---|---|
| GET | `/dos/teacher-assignments/overview` |
| GET/POST | `/dos/teacher-assignments` |
| PUT | `/dos/teacher-assignments/:id` |
| POST | `/dos/teacher-assignments/:id/archive` |
| GET | `/dos/teacher-assignments/:id/history` |
| POST | `/dos/teacher-assignments/sync-to-timetable` |
| POST | `/dos/teacher-assignments/sync-from-timetable` |
| DELETE | `/dos/teacher-assignments/:id` |

## Teacher period attendance (timetable-linked)

| Method | Endpoint |
|---|---|
| GET | `/dos/teacher-period/timetable` |
| GET | `/dos/teacher-period/settings` |
| PUT | `/dos/teacher-period/settings` |
| GET | `/dos/teacher-period/teachers` |
| GET | `/dos/teacher-period/logs` |
| POST | `/dos/teacher-period/scan` |
| GET | `/dos/teacher-period/alerts` |

## Teacher portal read APIs

Backend file: `BabyeyiSystem/backend/BabyeyiRoutes/teacherPortal.js`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/teacher-portal/timetable` | Teacher timetable view |
| GET | `/teacher-portal/timetable-filters` | Class/term/year filter metadata |

