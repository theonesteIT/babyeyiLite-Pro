# Termination Benefits

**Route:** `/accountant/payroll/termination-benefits`  
**Component:** `pages/Payroll/TerminationBenefits.jsx`  
**API:** `terminationBenefitsService.js`  
**Calc:** `terminationBenefitsCalc.js`, `terminatedMonthPayroll.js`

---

## Purpose

Manage employee **termination lifecycle** — severance calculation, settlement approval, payment, and integration with monthly payroll for final-month salary.

---

## Layout

- `AccountantOchreHero` + KPI cards (pending, paid, total severance, etc.)
- Filters bar (shared `TerminationFiltersBar`)
- Terminations table with pagination
- Modals: create/edit termination, severance rate settings
- `TerminationDetailDrawer` — full record view
- `TerminationPayrollWizard` — configure termination payroll snapshot

---

## Features

### Termination record

| Field | Description |
|-------|-------------|
| Staff search | `searchTerminationStaff()` |
| Termination date | Required |
| Use days worked | Pro-rata final month |
| Outstanding deductions | Reduces settlement |
| Reason & notes | Text |
| Status workflow | See below |

### Status workflow

From `TERMINATION_STATUSES`:

```
Draft → Submitted → Approved → Paid
         (reject paths)
```

Actions:

- `createTermination()` / `updateTermination()`
- `submitTermination()` — send for approval
- `markTerminationPaid()` — after payment

### Severance calculation

`calcTerminationSettlement()` uses:

- Net salary (from payroll profile)
- Years worked → multiplier tiers (`DEFAULT_SEVERANCE_RATES`)
- Outstanding deductions
- **Severance only** — final month salary handled separately in Payroll Run

Display in `SummaryCard`:

- Years worked, multiplier, severance benefit, gross settlement, total payable

### Severance rate configuration

- `getSeveranceRates()` / `saveSeveranceRates()`
- Admin modal to edit tier multipliers

### Analytics

- `getTerminationAnalytics()` — dashboard KPIs

### Payroll month integration

- `listTerminationsForPayrollMonth()` — used by Payroll Run
- `buildTerminatedPayrollSnapshot()` — pro-rata register row for terminating employee

### Filters & table

- Shared hook `useTerminationTable()`
- Department, status, date range, search
- `TablePagination`

---

## Components

| Component | Role |
|-----------|------|
| `TerminationPayrollWizard.jsx` | Step wizard for termination payroll config |
| `TerminationDetailPanel.jsx` | Status badges, RWF formatting |
| `TerminationDetailDrawer.jsx` | Side drawer details |

---

## Developer notes

- Loads active template in modal for net salary context
- Do not double-pay severance in regular run — UI notes clarify separation
- Align status enums between frontend and backend when adding states

---

## Related

- [03-payroll-run](./03-payroll-run.md)
- [05-termination-benefits](./05-termination-benefits.md) — this doc
- Manager route: `/manager/finance/termination-benefits` (TerminationReview)
