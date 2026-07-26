# Payroll Salary Template

**Route:** `/accountant/payroll/salary-template`  
**Component:** `pages/Payroll/SalaryTemplate.jsx`  
**API:** `payrollTemplateService.js`

---

## Purpose

Configure the **school-wide active payroll template**: statutory rates, PAYE brackets, allowance auto-rules, template allowances/deductions, and live register preview.

---

## Layout

- `AccountantOchreHero` header
- Tabbed sections: Statutory, PAYE, Allowance rules, Allowances table, Deductions table, Employee deductions, Preview register
- Sticky save bar with **Save template** / preview recalc
- `PayrollRegisterTable` — live preview with sample or selected staff

---

## Features

### Statutory rates

Editable percentages for RSSB, RAMA, CBHI, maternity, occupational hazard (employee + employer where applicable).

### PAYE brackets

- Default Rwanda progressive bands
- `calcProgressivePAYEBreakdown()` live preview
- `normalizePayeRates()` sanitizes saved template data

### School allowance auto-rules

| Setting | Default |
|---------|---------|
| Enabled | true |
| Total % of gross | 30% |
| Register column % (Others/H/A/T/A) | 10% each |

When enabled, preview uses `calcSchoolAllowancesFromBasic()`.

### Template allowances

| Field | Options |
|-------|---------|
| Category | Transport, Housing, Communication, … |
| Amount type | Fixed, % of Basic, % of Gross |
| Tax treatment | Taxable / Non-Taxable |
| **Payroll channel** | Tax / Bank / Tax & Bank |
| Frequency | Monthly |
| Applies to | All Employees |
| Status | Active / Inactive |

### Template deductions

Same structure with channel support (e.g. welfare fund on bank channel only).

### Per-employee deductions (CRUD)

- Search staff via `searchPayrollStaff()`
- Create/update/delete via `/employee-deductions` API
- Shown in preview via `filterPayrollEmployeeDeductions()`

### Preview & export

- Live `calcRwandaPayroll()` per preview employee
- **Export CSV / Excel** — `downloadPayrollRegisterCsv`, `downloadPayrollRegisterExcel`
- Sums footer via `sumPayrollRegisterRows()`

### Template persistence

- `getActivePayrollTemplate()` on load
- `savePayrollTemplate(payload)` on save
- `getPayrollTemplateHistory(limit)` — version history (API)

---

## Developer notes

- Allowance/deduction maps: `mapAllowanceFromApi` / `mapAllowanceToApi`
- Channel labels from `payrollChannelLabel()` in shared module
- Template must be **Active** for Payroll Run to proceed (`templateActive` check in `PayrollRun.jsx`)

---

## Related

- [00-payroll-engine](./00-payroll-engine.md)
- [02-staff-salary-setup](./02-staff-salary-setup.md)
- [03-payroll-run](./03-payroll-run.md)
