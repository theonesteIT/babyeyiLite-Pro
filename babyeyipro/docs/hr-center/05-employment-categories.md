# Employment Categories

**Route:** `/manager/hr/categories`  
**Component:** `EmploymentCategory.jsx`

---

## Purpose

Organize staff into employment type / role classification buckets with headcount visibility.

---

## Layout & design

```
┌ HERO ─ KPI: Categories | Total Staff ─ [Create category] ┐
├ Responsive grid of category cards (1/2/3 columns) ────────┤
└ Create category modal ────────────────────────────────────┘
```

Each **category card:**

- Colored pill label (rotating accent colors)
- Edit / Delete ghost buttons
- Description text
- Large employee count + % of total
- Progress bar (amber fill)
- **View employees** button (full width)

---

## Features

### KPI tiles

| KPI | Value |
|-----|-------|
| Categories | Count of category types |
| Total Staff | Sum across all categories |

### Default categories (static demo data)

| Category | Description | Sample count |
|----------|-------------|--------------|
| Teaching Staff | Academic and instructional | 142 |
| Administrative Staff | Office and admin support | 28 |
| Support Staff | Drivers, security, cleaners | 15 |
| Management | Directors, heads, managers | 8 |
| Temporary Staff | Short-term / seasonal | 5 |
| Interns | Student interns and trainees | 2 |

### Create category modal

| Field | Required |
|-------|----------|
| Category name | ✅ |
| Description | Optional |

> **Note:** Edit, Delete, View employees, and Create are **UI-only** — data is hardcoded in the component, not yet connected to the HR API.

---

## Future integration

When wired to backend, categories would link to employee `role_name` / employment classification and filter the directory.

---

## Related

- [Employee Directory filters](./02-employee-directory.md)
- [Departments](./07-departments.md)
