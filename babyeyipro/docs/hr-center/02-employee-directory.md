# Employee Directory

**Route:** `/manager/hr/directory`  
**Profile route:** `/manager/hr/directory/:employeeId`  
**Edit route:** `/manager/hr/directory/:employeeId/edit`  
**Component:** `EmploymentDirectory.jsx`

Also reused in **Accountant Portal** at `/accountant/payroll/employees`.

---

## Purpose

Search, filter, browse, export, bulk-select, and manage all school employees.

---

## Layout & design

```
┌──────────────── HERO ─────────────────┐
│ Title + [Export] [Import] [Add employee]│
└────────────────────────────────────────┘
┌────────────── Filter panel ─────────────┐
│ Search + 6 dropdown filters + Clear     │
└─────────────────────────────────────────┘
┌── Stat cards (5) ──────────────────────┐
│ Total | Active | Teachers | Support | On Leave │
└────────────────────────────────────────┘
┌── Bulk actions bar ────────────────────┐
│ Select all | Clear | Delete selected/all│
└────────────────────────────────────────┘
┌── Employee cards (paginated) ──────────┐
│ [✓] Avatar | Identity | Contact grid   │
│     Employment summary | ⋮ menu        │
└────────────────────────────────────────┘
```

Each **employee card** is a wide horizontal panel:

- **Left:** Checkbox, photo or colored initials avatar, name (clickable), status badge, employee ID, position, department · role
- **Center:** 4-column contact grid — Join date, Email, Phone, Address
- **Right:** Employment summary box — Type, Contract end, Department, Years of service, “View profile” button
- **Top-right:** ⋮ menu → View profile, Edit profile, Delete employee

---

## Features

### Header actions

| Action | Description |
|--------|-------------|
| **Export** | Downloads `.xlsx` with full import-template columns from current filtered list |
| **Import** | Navigates to Employee Registration (bulk import modal) |
| **Add employee** | Opens registration wizard |

### Search & filters

| Filter | Options |
|--------|---------|
| **Search** | Name, ID, email, position (debounced 300ms) |
| **Department** | All + HR department list |
| **Position** | All + staff position labels |
| **Status** | All, Active, Probation, Suspended, On Leave, Terminated |
| **Contract type** | All + Permanent, Temporary, Probation, etc. |
| **Year** | Hire/join year (last 12 years) |
| **Month** | Month filter |
| **Clear** | Resets all filters |

### Summary statistics (live from API)

- Total Employees, Active (%), Teachers (%), Support Staff (%), On Leave (%)

### List operations

| Feature | Description |
|---------|-------------|
| **Pagination** | 10 / 25 / 50 per page |
| **Multi-select** | Checkbox per card |
| **Select all** | All filtered employees |
| **Delete selected** | Soft-delete with confirmation modal |
| **Delete all shown** | Bulk delete matching filters |
| **Row menu** | View, Edit, Delete single employee |

### Terminated employees

- Shows termination date
- Indicates if login disabled

### Empty state

- “No employees found” with link to register

### Delete confirmation modal

- Warns about soft-delete
- Notes you cannot delete your own logged-in account

---

## Data source

`hrService.getDirectory()` with filter params → returns `data[]` + `stats{}`.

Delete uses `staffService.deleteStaff(id)`.

---

## Related

- [Employee Profile](./11-employee-profile.md)
- [Employee Registration](./03-employee-registration.md)
