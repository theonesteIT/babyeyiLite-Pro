# Departments

**Route:** `/manager/hr/departments`  
**Component:** `Departments.jsx`

---

## Purpose

Manage organizational departments — structure, heads, budgets, and staff counts.

---

## Layout & design

```
┌ HERO ─ KPI: Departments | Employees ────────────────────────┐
├ [Create department] ─────────────────────────────────────────┤
├ Grid of department cards (1/2/3 columns) ────────────────────┤
└ Create department modal ─────────────────────────────────────┘
```

Each **department card:**

- Colored initial avatar (first letter)
- Department name
- Head of department (or “No head assigned” in ochre)
- Edit / Delete buttons
- **3 mini stats:** Employees, Male, Female
- Budget (RWF) if set
- Expandable **Department details** (created date, ID)

---

## Features

### KPI tiles (live)

| KPI | Source |
|-----|--------|
| Departments | Count from API |
| Employees | Sum of `employees` across departments |

### Auto-seed defaults

On first load (or when opening create modal), calls `hrService.seedDefaultDepartments()` if empty.

**Default departments include:**

Leadership, Teaching Staff, Student Welfare, Administration, Finance, ICT, Laboratory, Library, Boarding, Support Staff, Sports & Clubs

### Create department

| Field | Required |
|-------|----------|
| Department name | ✅ |
| Department head | Optional (name text) |
| Budget (RWF) | Optional |

Saved via `hrService.createDepartment()`.

### Delete department

- Confirmation dialog
- `hrService.deleteDepartment(id)`

### Edit department

Edit button present in UI — **not yet wired** to update API.

---

## API

- `GET /school/hr/departments`
- `POST /school/hr/departments`
- `DELETE /school/hr/departments/:id`
- `POST /school/hr/departments/seed-defaults`

---

## Related

- [Organization Structure](./08-organization-structure.md)
- [Employee Registration — department field](./03-employee-registration.md)
