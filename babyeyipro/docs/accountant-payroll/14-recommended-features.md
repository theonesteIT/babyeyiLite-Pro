# Recommended Features (Not Yet Built or Incomplete)

Suggestions for product and engineering — based on gaps in the current accountant payroll codebase.

---

## Priority: High

### 1. Wire Bulk Salary Import to real API

**Current:** `BulkSalaryImport.jsx` uses `MOCK_PREVIEW` — sidebar link is disabled.

**Proposed:**

- Parse Excel → batch `saveStaffPayrollProfile()`
- Reuse column mapping from Employee Import + Staff Salary Setup fields
- Dry-run validation like HR import modal
- Enable sidebar link after API batch endpoint exists

### 2. Add Leave Management to sidebar

**Current:** `/payroll/leave` is routed but not in Payroll nav.

**Proposed:** Add sidebar item; unpaid leave should flag employees in Payroll Run preview.

### 3. Fix mobile BottomNav payroll link

**Current:** BottomNav **Payroll** → `/payroll/history` (legacy).

**Proposed:** Point to `/payroll/run` to match sidebar default.

### 4. Email payslips to staff

**Current:** Mail icon on Payslips page — no bulk email pipeline.

**Proposed:**

- Queue emails on mark-paid
- PDF attachment from `exportPayslipPdf`
- Staff notification preferences

### 5. Payroll approval workflow (multi-step)

**Current:** Run goes Draft → Processing → Paid with limited approval gates.

**Proposed:**

- School Manager approval before Processing
- Dual sign-off before Disbursement
- Audit trail already exists — extend with approver roles

### 6. RRA / RSSB export formats

**Current:** Generic tax PDF/Excel.

**Proposed:**

- Official RRA PAYE schedule format
- RSSB monthly declaration file layout
- Versioned export templates per tax year

---

## Priority: Medium

### 7. Salary revision history

**Current:** Staff Salary Setup shows `lastIncrement` placeholder.

**Proposed:**

- Version table: basic, allowances, effective date, changed by
- Diff view when editing salary
- Link increments to performance/appraisal (HR)

### 8. Mid-month adjustments (SalaryAdjustments page)

**Current:** `SalaryAdjustments.jsx` exists but not routed — mock only.

**Proposed:**

- Ad-hoc adjustment run (bonus, correction) without full monthly re-run
- Merge into next run or separate adjustment run type

### 9. Payroll dashboard KPIs

**Current:** Accountant Dashboard is finance-focused; no payroll-specific KPI widget.

**Proposed:**

- Next payroll date countdown
- Unpaid runs, missing bank accounts, pending terminations
- Monthly cost trend sparkline

### 10. Bank file format per institution

**Current:** Generic bank payment file export.

**Proposed:**

- BK bulk upload CSV spec
- BPR / Equity specific column layouts
- Validation before download

### 11. MoMo disbursement track

**Current:** Bank-focused; mobile money on employee profile but weak disbursement export.

**Proposed:**

- Separate MoMo payment batch
- MTN / Airtel file formats
- Reconciliation status per phone number

### 12. Connect Employment Categories to payroll

**Current:** HR Employment Categories is static demo data.

**Proposed:**

- Category → default template allowance package
- Filter reports by category
- Budget vs actual by category

### 13. Overtime & timesheet integration

**Current:** Overtime is an allowance category only — manual entry.

**Proposed:**

- Pull approved overtime hours from attendance module
- Auto-add to run-level allowances for period

### 14. Loan management module

**Current:** Loans as employee deductions — no amortization schedule UI.

**Proposed:**

- Loan principal, interest, remaining balance
- Auto-stop deduction when paid off
- Statement for employee in My Payroll

---

## Priority: Lower (nice to have)

### 15. Payroll simulation / what-if mode

Run preview without persisting — compare scenarios (e.g. 5% raise all teachers).

### 16. Multi-currency support

For international hires — currently RWF-only.

### 17. Budget enforcement

Link `Departments.budget_rwf` to payroll totals — warn when department payroll exceeds budget.

### 18. Scheduled payroll runs

Auto-generate draft run on configured day each month with notification to accountant.

### 19. Staff payroll notifications

Push/in-app when payslip ready, when salary changed, when advance deducted.

### 20. Consolidate legacy pages

Remove or redirect: `PayrollCenter`, `PayrollHistory`, `PayrollConfig` after feature parity confirmed.

### 21. Accountant payroll onboarding wizard

First-time setup: template → import staff → salary setup → test run checklist.

### 22. Reconciliation report

Compare bank statement imports vs disbursement records — mark matched/unmatched.

### 23. YTD totals on payslip

Year-to-date PAYE, RSSB, gross — fields partially stubbed in payslip builder.

### 24. API documentation (OpenAPI)

Backend payroll endpoints documented for third-party integrators.

---

## UX polish (quick wins)

| Item | Effort |
|------|--------|
| Enable Bulk Import in sidebar after wiring | Low |
| Add Leave to sidebar | Trivial |
| Fix BottomNav route | Trivial |
| Employment Categories edit/delete API | Medium |
| Transfer/Promote on HR Dashboard quick actions | Medium |
| Performance tab on Employee Profile | Medium |

---

## Cross-links

- HR feature gaps: [../hr-center/12-related-hr-features.md](../hr-center/12-related-hr-features.md)
- Legacy pages to replace: [12-legacy-and-hidden](./12-legacy-and-hidden.md)
