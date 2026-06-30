# Related HR Features (Manager Portal)

These features are **not** in the HR Center sidebar but are essential for complete workforce management in BabyeyiPro.

---

## Payroll

**Route:** `/manager/payroll`  
**Component:** `Payroll.jsx`

| Feature | Description |
|---------|-------------|
| Payroll overview | School payroll dashboard for managers |
| Staff self-service | `/manager/my-payroll` — individual payslips |
| Salary on employee record | Basic salary captured in registration/import |
| Salary certificate | Generated from profile (PDF/print) |
| Allowances | Transport, housing, others — import or auto-calc |

**Accountant portal overlap:**

- Reuses **Employee Directory** at `/accountant/payroll/employees`
- Payroll-focused import templates with allowance columns

---

## Staff Attendance

**Route:** `/manager/attendance/morning/staff`  
**Reports:** `/manager/reports/attendance/staff`

| Feature | Description |
|---------|-------------|
| Daily staff attendance | Record morning attendance |
| Profile link | Employee profile → Attendance tab → “Open staff attendance” |
| Staff metrics API | `/dos/reports/hr/staff-metrics` for reports |

---

## Termination & Benefits

**Route:** `/manager/finance/termination-benefits`  
**Component:** `TerminationReview.jsx`

| Feature | Description |
|---------|-------------|
| Termination review | Finance approval workflow for terminated staff benefits |
| Directory integration | Terminated employees show termination date + login disabled |

---

## System access & portal roles

Configured during **Employee Registration Step 6**.

**Portal-enabled positions (auto-suggest login):**

| Code | Role |
|------|------|
| TEACHER | Teacher |
| ACCOUNTANT | Accountant |
| DOS | DOS |
| STORE_MANAGER | Store Manager |
| ASSETS_MANAGER | Assets Manager |
| LIBRARIAN | Librarian |
| GATE_KEEPER | Gate Keeper |
| DISCIPLINE | Head of Discipline |
| SCHOOL_MANAGER | School Manager |
| HR | HR |

Other roles: Secretary, HOD/Staff, School Director, Custom (Others).

---

## HR import / export utilities

| File | Purpose |
|------|---------|
| `utils/hrEmployeeImportTemplate.js` | Template generators |
| `utils/hrStaffExport.js` | PDF/Excel staff export |
| `public/hr-employee-import-sample-50.xlsx` | Sample data |
| `scripts/generate-hr-import-sample.mjs` | Generate sample spreadsheets |

---

## Legacy note

`HRCentral.jsx` (~2,200 lines) is an older monolithic HR UI **not wired to routes**. The current HR Center in `HRPages/` replaces it.

---

## Mobile navigation

HR Center is **not** in the manager mobile bottom nav (Home, Babyeyi, My Payroll, Finance, Gate only). Access HR via sidebar on desktop/tablet.

---

## Back to HR Center index

[README — HR Center documentation](./README.md)
