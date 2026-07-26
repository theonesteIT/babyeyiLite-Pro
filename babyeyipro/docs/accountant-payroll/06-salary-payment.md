# Salary Payment

**Route:** `/accountant/payroll/salary-payment`  
**Component:** `pages/SalaryPayment.jsx`  
**API:** `payrollRunService.js`

---

## Purpose

**Review saved payroll runs** for a period — full register, totals, mark as paid, delete draft/processing runs, export Excel.

---

## Layout

- `AccountantOchreHero`
- Filters: Academic year, Month
- Run selector dropdown (all runs for period)
- Status badge: Draft / Processing / Paid
- Search within register
- `PayrollReportRegisterTable` with dynamic columns
- Action bar: Mark paid, Delete run, Export Excel

---

## Features

### Load runs

```javascript
getPayrollRuns({ month, year, academicYear, limit: 100 })
```

Auto-selects first run or keeps previous selection if still valid.

### Run detail

```javascript
getPayrollRun(selectedRunId)
getActivePayrollTemplate() // for column resolution
```

- `registerRowsFromRunDetail(runDetail, template)`
- `resolveRunReportColumns(rows, template)`
- `sumRunReportRows(rows)`

### Mark as paid

```javascript
markPayrollRunPaid(runId, payload)
```

- Only when not already paid
- Moves run to locked state → unlocks Payslips & Bank Payroll

### Delete run

```javascript
deletePayrollRun(runId)
```

- `isPayrollRunDeletable(status)` — blocked if paid
- Confirmation dialog

### Export

- `downloadRunPayrollRegisterExcel(rows, meta)` with school name, month, run number

### Error handling

- Separate `actionError` / `detailError` / `notice` states
- Loading spinners for runs vs detail

---

## Position in workflow

```
Payroll Run (trigger) → Salary Payment (review) → Disbursement (pay staff) → Paid
```

Accountant typically verifies register here before disbursement.

---

## Related

- [03-payroll-run](./03-payroll-run.md)
- [08-payroll-disbursement](./08-payroll-disbursement.md)
