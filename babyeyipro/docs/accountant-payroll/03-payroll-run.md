# Payroll Run

**Route:** `/accountant/payroll/run` (default `/payroll` landing)  
**Component:** `pages/Payroll/PayrollRun.jsx`  
**API:** `payrollRunService.triggerPayrollRun`, `getPayrollRuns`

---

## Purpose

Generate the **monthly payroll run** — select period, preview full register, apply run-only adjustments, include terminations, trigger backend run, export register.

---

## Layout

```
AccountantOchreHero
├── Period selectors (Academic year, Month, Term)
├── Status banners (paid / missing basic / inactive template)
├── Staff summary + StaffToProcessModal
├── Run-level adjustments panel (allowances/deductions clone)
├── PayrollReportRegisterTable (live preview)
├── Trigger run / Export Excel
└── Progress states: idle → running → done
```

---

## Features

### Period selection

- Academic year from `/dos/academic-calendar-settings`
- Month dropdown (January–December)
- Term filter (optional, from registry)
- `resolvePayrollCalendarYear()` for API year param

### Pre-run validation

| Check | Behavior |
|-------|----------|
| Period already **paid** | Blocks new run, links to Salary Payment |
| **Inactive template** | Warning banner |
| **No active template** | Blocks run |
| **Missing basic salary** | Lists employees — link to Staff Salary Setup |
| Staff profile allowances / deductions | Info banner |

### Staff selection

- `StaffToProcessModal` — include/exclude employees for this run
- Default: active staff with payroll profile
- Terminations loaded via `listTerminationsForPayrollMonth()`

### Run-level adjustments (month only)

Clone of template allowances/deductions editable for **this run only**:

- Does not persist to Salary Template unless saved there separately
- Types: Fixed, % Basic, % Gross
- Recalculates preview instantly

### Per-employee overrides

`staffAdjustments` map keyed by user ID:

- `extraAllowances`, `extraDeductions`
- `basicSalaryOverride`
- `allowanceSplit` override

### Live preview register

```
buildPayrollPreviewRows()
  → calcRwandaPayroll() per employee
  → enrichRegisterRowForReports()
  → PayrollReportRegisterTable
```

Footer sums via `sumRunReportRows()`.

### Trigger run

`POST /accountant/payroll/runs/trigger` payload includes:

- `academicYear`, `month`, `year`, `term`
- `staffUserIds[]` (included staff)
- Run-level `allowances`, `deductions`
- Per-staff adjustments map

**UI states:** `idle` → `running` → `done`

After success: run appears in Salary Payment with status **Processing**.

### Export

- `downloadRunPayrollRegisterExcel()` — pre-run or post-run register

### Existing runs check

- `getPayrollRuns({ month, year, academicYear })`
- Detects if period already has paid run

---

## Developer notes

- `cloneAllowancesFromTemplate()` / `cloneDeductionsFromTemplate()` seed run adjustments
- `mergeAllowancesWithExtras()` / `mergeEmployeeDeductionsWithExtras()` in preview builder
- Paid runs are immutable — delete only via Salary Payment if status allows

---

## Related

- [06-salary-payment](./06-salary-payment.md)
- [00-payroll-engine](./00-payroll-engine.md)
