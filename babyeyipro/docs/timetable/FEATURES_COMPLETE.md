# Timetable Module — Complete Feature Guide

This is the all-in-one manual for users and developers working on DOS Timetable.

## A. Routes and pages

- Main timetable page: `/dos/timetable`
- Teacher assignments: `/dos/teacher-assignments`
- Teacher period attendance: `/dos/teacher-period-attendance`

The main timetable page has 7 tabs:
- Teachers
- Courses
- Time Settings
- Generator
- Timetable
- Per Class Timetable
- Conflict Center

## B. Step-by-step implementation workflow

### Step 1 — Teacher Assignments
Set class + subject + teacher + `periods_per_week`.

### Step 2 — Teachers tab
Set teacher limits and availability.

### Step 3 — Courses tab
Define per-subject rules:
- priority
- lab requirements
- double period preference
- time preference (morning/afternoon/custom)

### Step 4 — Time Settings tab
Configure:
- school day start/end
- period duration
- active weekdays
- breaks

### Step 5 — Generator tab
Run generation for selected classes/term/year.
Review coverage summary.

### Step 6 — Apply generated timetable
Persist proposals to `academic_timetables`.

### Step 7 — Timetable tab (manual adjustments)
Use drag-and-drop for final fixes.
Backend validates conflicts on move/update.

### Step 8 — Conflict Center
Scan for clashes and optionally run auto-fix.

### Step 9 — Exports
Export class, teacher, and master PDFs.

### Step 10 — Validation
Check teacher portal timetable and attendance flows.

## C. Frontend + backend mapping

| Frontend | Backend |
|---|---|
| `dos/pages/Timetable.jsx` | `dosAcademic.js` timetable system endpoints |
| `dos/pages/TeacherAssignment.jsx` | `teacherAssignmentsSchema.js` + assignment APIs |
| `DndTimetableGrid.jsx` | `PUT /dos/timetable/:id` validation |
| `ExtraActivitiesModal.jsx` | extra activities endpoints + sync |

## D. Recommended QA checklist

- No teacher overlaps in same time slot
- No class double-booked slots
- Coverage ~= expected `periods_per_week`
- Extra activities placed without collisions
- Teacher portal displays complete timetable
- Attendance pages resolve timetable rows correctly

## E. Important references

- [Architecture](./00-architecture.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Business Rules](./BUSINESS_RULES.md)
- [Features Index](./FEATURES_INDEX.md)

