# Payroll Disbursement

**Route:** `/accountant/payroll/disbursement`  
**Component:** `pages/Payroll/PayrollDisbursement.jsx`  
**API:** `payrollDisbursementService.js`

---

## Purpose

Execute **payment processing** for approved payroll runs — apply disbursement deductions, verify approvals, mark employees paid, audit trail, export payment files.

---

## Layout

- Period filters (academic year, month, payroll number)
- Run list filtered by status (Approved / Paid)
- Tabs: Disbursement | Deduction rules | Audit trail | History
- Employee payment table with bank/dept filters
- Modals: deduction rule editor, individual payment confirmation

---

## Features

### Run selection

- `getApprovedPayrollRuns()` — runs ready to pay
- `getPaidPayrollRuns()` — history tab
- `getPayrollRun(id)` — line-level detail
- Locked when `isPayrollRunLocked(status)` (paid)

### Payment rows

```javascript
mapLineToPaymentRow(line, runDetail)
groupPaymentsByBank(rows)
```

Columns: employee, department, bank, account, net, final payable, payment status.

### Disbursement deduction rules

CRUD on `/disbursement-deduction-rules`:

| Field | Example |
|-------|---------|
| deductionType | Welfare |
| applyTo | all / department |
| amountType | fixed / percent |
| monthScope | single / recurring |
| frequency | always / once |

- `applyScheduledDeductions(runId)` — apply rules to run
- `applyDisbursementDeductions(runId, payload)` — ad-hoc with optional save-as-rule

### Mark paid (run or individual)

**Full run:**

```javascript
markPayrollRunPaidWithDetails(runId, {
  paymentDate, paymentReference, transactionNumber, paymentMethod
})
```

**Verification checklist modal:**

- Approval verified
- Review verified
- Accounts verified
- Ready to disburse

### Audit trail

- `getPayrollRunAuditTrail(runId)` — timestamped actions

### Exports

- `downloadDisbursementExcel(rows, meta)`
- `downloadBankPaymentFile(bankName, rows)` — text/CSV bank upload format
- `downloadBankPaymentExcel(...)`

### Delete run

- `deletePayrollRun()` — if not locked

---

## Developer notes

- Status labels via `disbursementStatusLabel()`
- `applyTo` rules engine lives mostly on backend — frontend forms POST payloads
- Search + dept + bank filters are client-side on loaded rows

---

## Related

- [06-salary-payment](./06-salary-payment.md)
- [10-bank-payroll](./10-bank-payroll.md)
- [09-payslips](./09-payslips.md)
