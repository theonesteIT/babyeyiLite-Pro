# Payroll Reports

**Route:** `/accountant/payroll/reports`  
**Component:** `pages/Payroll/PayrollReports.jsx`

---

## Purpose

Analytics and regulatory exports for **Tax Payroll** and **Bank Payroll** registers — charts, KPIs, PDF/Excel download.

---

## Layout

- Filter bar: Academic year, Month, Payroll run selector, Refresh
- KPI cards: gross payroll, net pay, PAYE, RSSB, headcount, etc.
- **Tabs:** Tax Payroll | Bank Payroll
- Recharts: trend lines, bar charts, pie distribution
- Dynamic columns from `resolveTaxReportColumns()` / `resolveBankReportColumns()`
- `PayrollReportRegisterTable` with export buttons

---

## Features

### Data loading

1. `getPayrollRuns()` for period
2. `getPayrollRun(selectedRunId)` for line detail
3. `registerRowsFromRunDetail()` — map API lines to register rows
4. `enrichRegisterRowForReports()` — tax/bank column split
5. Optional preview mode via `buildPayrollPreviewRows()` when no run selected

### Tax Payroll tab

Columns typically include:

- Gross, taxable allowances, PAYE, RSSB employee, RAMA, CBHI, maternity
- Template deductions (tax channel)
- Tax net salary

**Exports:**

- `downloadTaxPayrollReportPdf()`
- `downloadTaxPayrollReportExcel()`

### Bank Payroll tab

Columns typically include:

- Bank name, account, net salary, bank-channel deductions
- Final payable amount

**Exports:**

- `downloadBankPayrollReportPdf()`
- `downloadBankPayrollReportExcel()`

### Analytics

`computeReportAnalytics(rows)` — aggregates for charts:

- Department breakdown
- PAYE vs net trend (multi-month when runs available)
- Statutory totals

### Terminations overlay

- Loads terminations for month via `listTerminationsForPayrollMonth()`
- Reflects terminated staff in analytics

---

## Developer notes

- Uses same column resolution as Salary Payment for consistency
- `isPayrollRunPaid()` affects which runs appear in paid-only views
- Chart colors: navy `#000435`, amber `#F59E0B`

---

## Related

- [00-payroll-engine](./00-payroll-engine.md) — channel logic
- [13-services-and-utils](./13-services-and-utils.md) — export functions
