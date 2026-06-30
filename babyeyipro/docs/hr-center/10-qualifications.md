# Qualifications

**Route:** `/manager/hr/qualifications`  
**Component:** `Qualifications.jsx`

---

## Purpose

School-wide view of staff academic credentials — search, filter by level, verify status, and jump to employee records.

---

## Layout & design

```
┌ HERO ─ KPI: Records | Verified ───────────────────────────────┐
├ Search + [Add qualification] ──────────────────────────────────┤
├ Level distribution mini-cards (6 columns) ─────────────────────┤
├ Filter pills: All | A2 | Diploma | Bachelor's | … ─────────────┤
├ Data table (paginated, 10/page) ───────────────────────────────┤
└ Toast notifications ───────────────────────────────────────────┘
```

**Level chip colors:**

| Level | Color |
|-------|-------|
| A2 | Slate |
| Diploma | Sky |
| Bachelor's | Amber |
| Master's | Violet |
| PhD | Red |
| Professional Cert | Emerald |

---

## Features

### KPI tiles (live)

| KPI | Description |
|-----|-------------|
| Records | Total qualification entries |
| Verified | Confirmed credentials count |

### Level distribution

6 mini panels showing count per level (A2, Diploma, Bachelor's, Master's, PhD, Professional Cert).

### Search

Filter by employee name or qualification field.

### Level filter pills

Click to filter table by qualification level.

### Qualifications table

| Column | Content |
|--------|---------|
| Employee | Name + employee ID |
| Qualification | Level chip |
| Field | Study field |
| Institution | School / university |
| Year | Graduation year |
| Grade | Grade/class |
| Verified | ✓ Verified or **Verify** button |
| Actions | View profile, Attach (edit) |

### Add qualification

Button shows toast: *“Add/edit qualifications from employee profile edit wizard.”*

Qualifications are captured in **Registration Step 5** (repeatable rows).

### Verify

Verify button per row — UI present; backend verification flag reads `q.verified` or `q.document_verified`.

---

## Data source

Flattened from directory: each employee's `hr_profile.qualifications[]` becomes table rows.

---

## Related

- [Employee Registration — Step 5](./03-employee-registration.md)
- [Employee Profile — Qualifications tab](./11-employee-profile.md)
