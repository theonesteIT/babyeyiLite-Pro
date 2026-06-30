# Staff Salary Setup

**Route:** `/accountant/payroll/staff-salary-setup`  
**Component:** `pages/Payroll/StaffSalarySetup.jsx`  
**API:** `payrollTemplateService.js`

---

## Purpose

Configure **individual employee salary packages** — basic, register allowances (Others/H/A/T/A), supplemental allowances, custom deductions, salary advances, and **net-to-gross** reverse calculation.

---

## Layout

- Split view: staff search list (left) + salary editor (right)
- Mode toggle: **Normal Payroll** vs **NetToGross Salary Payroll**
- Live calculation panel with gross → statutory → net breakdown
- Save / Send actions with toast feedback

---

## Features

### Staff search

- `searchPayrollStaff(query)` — debounced search
- Shows department, position, contract status badges
- Loads existing profile: basic, allowances, deductions, advances

### Normal payroll mode

**Register columns (school standard):**

| Field | Register label |
|-------|----------------|
| `others` | Others |
| `housing` | H/A |
| `transport` | T/A |

**Supplemental allowances:**

- Meal, Communication, Responsibility
- Custom allowance rows (add/remove)

**Auto vs manual:**

- If staff has no stored split, `mergeRegisterAllowanceAmounts()` applies template auto-rules
- Manual edits saved to staff profile fields

### Net-to-gross mode

- Enter **desired net take-home**
- `calcNetToGrossFromDesiredNet()` solves for basic + split
- Shows computed basic before save

### Deductions

- Pull template + employee deductions from API
- Add custom one-off deductions in UI
- `getEmployeePayrollDeductions()` / `createEmployeePayrollDeduction()` / `deleteEmployeePayrollDeduction()`

### Salary advances

- `getStaffAdvanceCheck(staffUserId)` — outstanding advance balance
- Advance repayment rows with month count
- Deducted in payroll engine via employee deductions

### Save payload

`saveStaffPayrollProfile(userId, payload)` sends:

```javascript
{
  payroll_basic_salary,
  payroll_transport_allowance,
  payroll_housing_allowance,
  payroll_meal_allowance,
  payroll_other_allowances: [{ name, amount }, ...]
}
```

Built by `buildStaffAllowancePayload()`.

### Live preview

- Recalculates on every field change using active template statutory + `calcRwandaPayroll()`
- Shows PAYE breakdown, employer costs, final net

---

## Developer notes

- `parseStaffPayrollAllowances()` — hydrates form from API profile
- `KNOWN_OTHER_ALLOWANCES` maps communication/responsibility from JSON blob
- Always load active template alongside staff for consistent statutory rates

---

## Related

- [01-salary-template](./01-salary-template.md)
- [03-payroll-run](./03-payroll-run.md)
- [07-employees-hr](./07-employees-hr.md)
