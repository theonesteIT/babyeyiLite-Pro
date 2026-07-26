# My Payroll (Staff Self-Service)

**Route:** `/accountant/my-payroll`  
**Component:** `pages/StaffPayroll.jsx` → `shared/pages/StaffPayroll.jsx`  
**API:** `GET /staff/payroll/my`

---

## Purpose

Allows **logged-in staff** (including accountant users) to view their own payslips and payroll history — not an admin page.

---

## Implementation

Thin wrapper:

```jsx
<SharedStaffPayroll apiClient={api} endpoint="/staff/payroll/my" />
```

Shared component handles:

- Payslip list by period
- Download / view own payslips
- Mobile-friendly layout

---

## Navigation

- Sidebar: **My Payroll** under Payroll group
- Mobile `BottomNav`: **My Payroll** tab

---

## Developer notes

- Uses same payslip rendering patterns as admin Payslips page
- Endpoint is staff-scoped — no user ID in URL (session-based)
- Also available in Manager portal at `/manager/my-payroll`

---

## Related

- [09-payslips](./09-payslips.md)
- [14-recommended-features](./14-recommended-features.md)
