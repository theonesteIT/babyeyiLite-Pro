# Architecture — Accountant Payroll

---

## Folder map

```
accountant_portal/
├── PortalRoutes.jsx              # All /accountant routes
└── frontend/src/
    ├── components/
    │   ├── AccountantOchreHero.jsx
    │   ├── PayrollRegisterTable.jsx
    │   ├── PayrollReportRegisterTable.jsx
    │   ├── ModernPayslipDocument.jsx
    │   ├── TerminationPayrollWizard.jsx
    │   ├── TerminationDetailPanel.jsx
    │   └── payroll/StaffToProcessModal.jsx
    ├── pages/
    │   ├── Payroll/
    │   │   ├── PayrollRun.jsx
    │   │   ├── SalaryTemplate.jsx
    │   │   ├── StaffSalarySetup.jsx
    │   │   ├── PayrollReports.jsx
    │   │   ├── PayrollDisbursement.jsx
    │   │   ├── BankPayroll.jsx
    │   │   ├── PaySlips.jsx
    │   │   ├── TerminationBenefits.jsx
    │   │   ├── BulkSalaryImport.jsx      # mock — not production
    │   │   └── SalaryAdjustments.jsx     # not routed
    │   ├── SalaryPayment.jsx
    │   ├── PayrollHistory.jsx            # legacy
    │   ├── PayrollConfig.jsx             # legacy workspace
    │   ├── PayrollCenter.jsx             # legacy mock
    │   └── StaffPayroll.jsx              # wrapper → shared
    ├── services/
    │   ├── api.js
    │   ├── payrollRunService.js
    │   ├── payrollTemplateService.js
    │   ├── payrollDisbursementService.js
    │   ├── payslipBrandingService.js
    │   └── terminationBenefitsService.js
    └── utils/
        ├── rwandaPayrollEngine.js        # ★ core math
        ├── payrollPreview.js
        ├── payrollRegister.js
        ├── payrollReportTables.js
        ├── payrollReportExport.js
        ├── payrollStaffAllowances.js
        ├── payrollEmployeeDeductions.js
        ├── payslipBuilder.js
        ├── exportPayslipPdf.js
        ├── terminationBenefitsCalc.js
        ├── terminatedMonthPayroll.js
        └── academicCalendarFilters.js

shared/payroll/                   # Cross-portal payroll UI & channels
shared/pages/StaffPayroll.jsx     # Staff self-service
manager/pages/HRPages/*           # Reused employee CRUD
```

---

## Data flow: preview vs persisted run

### Client-side preview (before run)

```
Staff list + active template
  → buildPayrollPreviewRows()          [payrollPreview.js]
  → calcRwandaPayroll() per employee   [rwandaPayrollEngine.js]
  → PayrollReportRegisterTable (live recalc)
```

### Persisted run (after trigger)

```
triggerPayrollRun(payload)             [POST /runs/trigger]
  → Backend stores run + lines + register_json
  → getPayrollRun(id) loads lines
  → mapApiLineToRegisterRow()          [payrollRegister.js]
  → enrichRegisterRowForReports()      [payrollReportTables.js]
```

---

## Academic year vs calendar year

Payroll period pickers use **academic year** from `/dos/academic-calendar-settings`:

- `parseManagerAcademicSettings()` — registry of years/terms
- `resolvePayrollCalendarYear(academicYear, month)` — maps June/July split to calendar year for API params

Used on: Payroll Run, Salary Payment, Reports, Disbursement, Bank Payroll, Payslips.

---

## Payroll channels (tax vs bank)

Template allowances/deductions have a **channel**:

| Channel | Tax register | Bank net pay |
|---------|--------------|--------------|
| `tax` | ✅ | — |
| `bank` | — | ✅ adjusts bank net only |
| `both` | ✅ | included in tax net |

Defined in `shared/payroll/payrollTemplateChannels.js`. See [00-payroll-engine](./00-payroll-engine.md).

---

## Register columns (school standard)

Typical register row fields:

- Employee ID, name, RSSB, department
- **Basic Salary**
- **Others / H/A / T/A** (10% of gross each when auto-allowance rules enabled)
- Gross, PAYE, RSSB employee, RAMA, CBHI, maternity
- Template + employee deductions
- **Net salary**, **Final payable** (after bank-channel adjustments)

Built by `buildPayrollRegisterRow()` and enriched for reports.

---

## Termination integration

- `listTerminationsForPayrollMonth()` — staff terminating in selected month
- `buildTerminatedPayrollSnapshot()` — pro-rata final month in register
- Severance paid separately via Termination Benefits (not mixed into monthly run net)

---

## Authentication & layout

- `AuthProvider` + `ProtectedRoute` wrap all routes
- `Layout` + `Sidebar` render payroll nav group
- `BottomNav`: **Payroll** still links to `/payroll/history` (legacy) — consider aligning to `/payroll/run`

---

## Related HR module

Employee bank details, basic salary, RSSB, and import templates are shared with Manager HR Center. Accountant routes remap paths:

| Manager | Accountant |
|---------|------------|
| `/manager/hr/directory` | `/accountant/payroll/employees` |
| `/manager/hr/registration` | `/accountant/payroll/employees/import` |

See [07-employees-hr](./07-employees-hr.md).
