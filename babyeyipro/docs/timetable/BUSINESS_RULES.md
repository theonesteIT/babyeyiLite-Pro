# Timetable Business Rules

## 1) Source of truth

- `teacher_assignments` defines who teaches what and how many periods/week.
- Generator consumes these assignments and writes final placements to `academic_timetables`.
- Marks and reports rely on assignment IDs, so assignment data must stay clean.

## 2) Slot generation

- Slots are generated from `timetable_school_schedule`:
  - start time / end time
  - period duration
  - active days
  - breaks
- Break windows are excluded from teaching slots.

## 3) Generator placement

Inputs:
- assignments (`periods_per_week`)
- teacher profiles (`max_periods_per_day`, availability)
- course config (priority, lab, double period, custom windows)
- existing timetable (busy maps)
- extra activities (reserved slots)

Output:
- proposed rows `{ class_name, subject_name, staff_id, day_of_week, start_time, end_time }`
- coverage stats (expected vs placed)

## 4) Conflict rules

### Teacher clash
Same teacher cannot have overlapping lessons across classes in same slot.

### Lesson overlap
Same class cannot have two lessons in the same time slot.

### Rule violation
Course rules (morning only / afternoon only / custom window) must be respected.

### Extra activity overlap
Extra activity cannot block already occupied teaching slots beyond allowed capacity.

## 5) Manual edits (drag & drop / CRUD)

- Moving a lesson triggers backend validation.
- If movement creates clash, API returns conflict error and move should be reverted in UI.

## 6) Apply/regenerate behavior

- `generate` prepares proposals.
- `apply` writes accepted proposals to `academic_timetables`.
- `regenerate` re-runs generation for selected classes/term/year.
- `clear-timetables` removes placed slots but does not delete assignment definitions.

## 7) Extra activities

- Stored in `timetable_extra_activities`.
- Synced into `academic_timetables` using `extra_activity_id`.
- Capacity validation should be checked before save.

## 8) Attendance dependencies

- Student and teacher attendance modules read timetable rows by term/year/day.
- Missing timetable rows lead to attendance fallback behavior; keep timetable complete.

## 9) Recommended safe workflow

1. Create/update teacher assignments  
2. Configure teachers/courses/schedule  
3. Generate  
4. Review coverage and conflicts  
5. Apply  
6. Manual DnD fine-tuning  
7. Re-scan conflicts  

