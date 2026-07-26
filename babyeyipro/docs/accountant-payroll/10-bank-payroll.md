# Bank Payroll (Bank Transfers)

**Route:** `/accountant/payroll/bank-payroll`  
**Component:** `pages/Payroll/BankPayroll.jsx`

---

## Purpose

Generate **bank transfer files** grouped by bank — for uploading to BK, BPR, Equity, I&M, Ecobank, etc.

---

## Layout

- Period selectors (academic year, month, run)
- Summary KPIs: total employees, total amount, bank count
- Bank cards grid — one card per bank with employee count + total RWF
- **BankEmployeesModal** — employee list per bank with export
- Uses paid or approved runs (configurable load — primarily **paid**)

---

## Features

### Bank grouping

```javascript
groupPaymentsByBank(paymentRows)
bankShortName(bankName)  // BK, BPR, Equity, I&M, Ecobank
```

`BANK_META` — colors and labels per bank for UI.

### Bank card

- Bank code badge
- Employee count
- Total payable RWF
- Click → open modal

### Bank employees modal

| Column | Content |
|--------|---------|
| Employee | Name, ID, dept |
| Account Number | Bank account |
| Amount Paid | finalPayable |
| Status | Paid / Processing |
| Payment Date | From run metadata |

- Search within bank
- **Generate & Download** → `downloadBankPayrollReportExcel()` or bank file export

### Exports

From `payrollDisbursementService.js`:

- `downloadBankPaymentFile(bank, rows)` — bank upload format
- `downloadBankPaymentExcel(bank, rows, meta)`

### School context

- `getSchoolName()` from localStorage user object

---

## Developer notes

- Align run selection with Payslips — same paid run for consistency
- `formatPayrollPaymentDate(runDetail)` for payment date column
- `employeePaymentStatus(line)` derives row status

---

## Related

- [08-payroll-disbursement](./08-payroll-disbursement.md)
- [04-payroll-reports](./04-payroll-reports.md) — Bank tab
