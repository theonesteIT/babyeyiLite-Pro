# Leave Management

**Route:** `/manager/hr/leave`  
**Query param:** `?staff={employeeId}` — pre-opens register modal for that employee  
**Component:** `LeaveManagement.jsx` + `LeaveRegisterModal.jsx`

---

## Purpose

Manage leave requests — register, filter, approve/reject, view details, and track school-wide leave stats.

---

## Layout & design

```
┌ HERO ─ [Export ▼] [Register leave] ─────────────────────────┐
├ 6 stat cards ────────────────────────────────────────────────┤
├ Filter panel (search + 6 filters) ───────────────────────────┤
├ Status tabs: All | Pending | Approved | Rejected ────────────┤
├ Leave requests table (paginated) ────────────────────────────┤
├ LeaveRegisterModal ──────────────────────────────────────────┤
└ View request detail modal (wide) ────────────────────────────┘
```

---

## Features

### Summary statistics (live API)

| Stat | Description |
|------|-------------|
| Total Requests | All time |
| Pending | Awaiting approval |
| Approved | This year |
| Rejected | This year |
| On Leave | Currently away |
| Annual Balance | School-wide days remaining |

### Filters

| Filter | Options |
|--------|---------|
| Search | Leave requests text search |
| Department | All + HR departments |
| Leave type | All + configured leave types |
| Status | All, Pending, Approved, Rejected, Draft |
| Date from / to | Date range |
| Employee | All + individual staff |
| Reset | Clears all filters |

### Status tabs

- All Requests
- Pending (count)
- Approved (count)
- Rejected (count)

### Requests table

| Column | Content |
|--------|---------|
| Employee | Name + ID |
| Leave Type | Type code + department |
| Duration | Total days |
| Leave Dates | Start → End |
| Status | Color badge |
| Applied On | Application date |
| Actions | View, Approve ✓, Reject ✗ (pending only) |

### Approve / Reject

One-click status update via `hrService.updateLeaveStatus()`.

### Register leave modal

Opens from header button or `?staff=` URL param. Uses employee list from directory.

### View request modal (wide)

| Section | Fields |
|---------|--------|
| Employee | Name, ID, department |
| Leave type | Type + total days |
| Status | Badge + applied date |
| Summary | Dates, position, emergency phone, alt contact, address during leave, reason |
| Documents | Attached files list |
| Approval timeline | Submitted → pending/approved/rejected with approver name |

### Export

Export button in header (UI present — implementation may vary).

---

## Leave types (from constants)

Configured in `hrConstants.js` — e.g. Annual Leave, Sick Leave, Maternity, etc.

---

## Related

- [Employee Profile — Leave tab](./11-employee-profile.md)
- [HR Dashboard quick action](./01-hr-dashboard.md)
