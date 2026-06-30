# Payslips Management

**Route:** `/accountant/payroll/payslips`  
**Component:** `pages/Payroll/PaySlips.jsx`  
**Components:** `ModernPayslipDocument.jsx`, `exportPayslipPdf.js`

---

## Purpose

View, preview, **download PDF**, and **print** payslips for **paid** payroll runs.

---

## Layout

- Filters: Academic year, Month, Payroll run, Department, Position, Status
- Search employees
- Payslip list grid/table
- Slide-over **Payslip Preview** panel (full height, right side)
- Link to Settings for branding

---

## Features

### Load paid runs only

```javascript
getPaidPayrollRuns({ month, year, academicYear })
getPayrollRun(runDbId)
mapLineToPaymentRow() → payslip list
```

### Payslip data pipeline

```
buildPayslipData(paymentRow, runMeta, schoolBranding)
  → ModernPayslipDocument
  → exportPayslipPdf / printPayslip
```

### Branding

- `getPayslipBranding()` on mount
- Configured in **Accountant Settings** (`payslipBrandingService`)
- Logo, stamp, signature URLs via `payslipAssets.js`

### Preview panel actions

| Action | Implementation |
|--------|----------------|
| Download PDF | html2canvas + jsPDF |
| Print | `printPayslip()` window |
| Close | Dismiss drawer |

### Bulk actions (UI)

- Icons for mail/archive — check implementation status before relying in production

### Filters

- Department, position, payment status
- Client-side filter on loaded payslips

---

## Payslip content (typical)

- School header + branding
- Employee ID, name, department, position
- Pay period, run number
- Earnings: basic, allowances breakdown
- Deductions: PAYE, RSSB, RAMA, loans, etc.
- Net pay, YTD placeholders (if configured)

---

## Developer notes

- Requires run status **paid** — aligns with `getPaidPayrollRuns`
- PDF export uses `html2canvasExportFix.js` for clone DOM fixes
- Settings link: `/accountant/settings`

---

## Related

- [08-payroll-disbursement](./08-payroll-disbursement.md)
- [11-my-payroll](./11-my-payroll.md) — staff view
- [14-recommended-features](./14-recommended-features.md) — email payslips
