# Services & Utils Reference

Quick reference for developers extending accountant payroll.

---

## Services

### `payrollRunService.js`

| Function | Method | Path |
|----------|--------|------|
| `getPayrollRuns(params)` | GET | `/accountant/payroll/runs` |
| `getPayrollRun(id)` | GET | `/accountant/payroll/runs/:id` |
| `triggerPayrollRun(payload)` | POST | `/accountant/payroll/runs/trigger` |
| `deletePayrollRun(id)` | DELETE | `/accountant/payroll/runs/:id` |
| `markPayrollRunPaid(id, payload)` | PATCH | `/accountant/payroll/runs/:id/status` |

Helpers: `isPayrollRunPaid`, `isPayrollRunDeletable`, `payrollRunStatusLabel`

### `payrollTemplateService.js`

| Function | Method | Path |
|----------|--------|------|
| `getActivePayrollTemplate()` | GET | `/accountant/payroll/templates/active` |
| `getPayrollTemplateHistory(limit)` | GET | `/accountant/payroll/templates/history` |
| `savePayrollTemplate(payload)` | POST | `/accountant/payroll/templates` |
| `previewPayrollCalculation(payload)` | POST | `/accountant/payroll/templates/preview` |
| `getEmployeePayrollDeductions(params)` | GET | `/accountant/payroll/employee-deductions` |
| `createEmployeePayrollDeduction(payload)` | POST | `/accountant/payroll/employee-deductions` |
| `updateEmployeePayrollDeduction(id, payload)` | PATCH | `/accountant/payroll/employee-deductions/:id` |
| `deleteEmployeePayrollDeduction(id)` | DELETE | `/accountant/payroll/employee-deductions/:id` |
| `searchPayrollStaff(query, limit)` | GET | `/accountant/payroll/staff/search` |
| `saveStaffPayrollProfile(userId, payload)` | PATCH | `/accountant/payroll/staff/:userId` |
| `getStaffAdvanceCheck(staffUserId)` | GET | `/accountant/payroll/advance-check/:staffUserId` |

### `payrollDisbursementService.js`

| Function | Path |
|----------|------|
| `getApprovedPayrollRuns` | runs?status=approved |
| `getPaidPayrollRuns` | runs?status=paid |
| `getDisbursementDeductionRules` | `/disbursement-deduction-rules` |
| `create/update/deleteDisbursementDeductionRule` | CRUD on rules |
| `applyScheduledDeductions(runId)` | POST runs/:id/apply-scheduled-deductions |
| `applyDisbursementDeductions(runId, payload)` | POST runs/:id/disbursement-deductions |
| `markPayrollRunPaidWithDetails(runId, payload)` | PATCH status |
| `getPayrollRunAuditTrail(runId)` | GET audit-trail |
| `mapLineToPaymentRow(line)` | client mapper |
| `groupPaymentsByBank(rows)` | client grouper |
| `downloadDisbursementExcel` | client export |
| `downloadBankPaymentFile/Excel` | client export |

### `payslipBrandingService.js`

| Function | Path |
|----------|------|
| `getPayslipBranding()` | GET `/payslip-branding` |
| `savePayslipBranding(payload)` | POST `/payslip-branding` |
| Upload assets | POST `/babyeyi/upload-asset` |

### `terminationBenefitsService.js`

| Function | Purpose |
|----------|---------|
| `listTerminations` | Paginated list |
| `createTermination` / `updateTermination` | CRUD |
| `submitTermination` | Workflow |
| `markTerminationPaid` | Payment |
| `searchTerminationStaff` | Staff picker |
| `getSeveranceRates` / `saveSeveranceRates` | Config |
| `getTerminationAnalytics` | KPIs |
| `listTerminationsForPayrollMonth` | Payroll Run integration |

---

## Utils

| File | Purpose |
|------|---------|
| `rwandaPayrollEngine.js` | Core PAYE/statutory/net calc — [00-payroll-engine](./00-payroll-engine.md) |
| `payrollPreview.js` | `buildPayrollPreviewRows()` — batch preview for run/reports |
| `payrollRegister.js` | Register row build, CSV/Excel, `mapApiLineToRegisterRow` |
| `payrollReportTables.js` | Tax/bank columns, analytics, `enrichRegisterRowForReports` |
| `payrollReportExport.js` | PDF/Excel for tax, bank, run register |
| `payrollStaffAllowances.js` | Allowance split merge, normalize split |
| `payrollEmployeeDeductions.js` | Filter/map employee deductions for engine |
| `payslipBuilder.js` | `buildPayslipData()`, school info |
| `exportPayslipPdf.js` | PDF + print via html2canvas/jsPDF |
| `payslipAssets.js` | Logo/stamp URL resolution |
| `html2canvasExportFix.js` | DOM clone fixes for export |
| `terminationBenefitsCalc.js` | Severance tiers, settlement |
| `terminatedMonthPayroll.js` | Final month snapshot for register |
| `academicCalendarFilters.js` | Year/term resolution for payroll periods |

---

## Shared modules (`shared/payroll/`)

| File | Purpose |
|------|---------|
| `payrollTemplateChannels.js` | Tax/bank/both channel logic |
| `payrollHelpers.js` | Formatting helpers |
| `payrollExport.js` | Generic export utilities |
| `PayrollWorkspaceTabs.jsx` | Legacy config workspace |
| `staffSalarySetupCalc.js` | Shared calc helpers |
| `salaryCertificatePdf.js` | Salary certificate (HR profile) |

---

## Components

| Component | Used by |
|-----------|---------|
| `PayrollRegisterTable` | Salary Template preview |
| `PayrollReportRegisterTable` | Run, Salary Payment, Reports |
| `ModernPayslipDocument` | Payslips preview |
| `StaffToProcessModal` | Payroll Run |
| `TerminationPayrollWizard` | Termination Benefits |

---

## Sample data files

| Path | Purpose |
|------|---------|
| `public/hr-employee-import-minimal.csv` | Minimal payroll import |
| `public/hr-employee-import-sample-50.xlsx` | Full sample |
| `manager/utils/hrEmployeeImportTemplate.js` | Template generators |

---

## Adding a new payroll page — checklist

1. Add route in `PortalRoutes.jsx`
2. Add sidebar entry in `components/Sidebar.jsx` NAV_GROUPS.payroll
3. Use `AccountantOchreHero` for consistent header
4. Load academic calendar for period filters
5. Use `calcRwandaPayroll()` — never duplicate tax math
6. Use `PayrollReportRegisterTable` for tabular register UI
7. Document in `docs/accountant-payroll/`
