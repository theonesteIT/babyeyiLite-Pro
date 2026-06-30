# Employees & HR Pages (Reused)

Accountant payroll **does not duplicate** employee CRUD — it imports Manager HR pages with route remapping.

---

## Routes

| Route | Component | Source |
|-------|-----------|--------|
| `/payroll/employees` | `EmploymentDirectory` | `manager/pages/HRPages/` |
| `/payroll/employees/import` | `EmploymentRegistration` | same |
| `/payroll/employees/:id` | `EmployeeProfile` | same |
| `/payroll/employees/:id/edit` | `EmploymentRegistration` | same |
| `/payroll/leave` | `LeaveManagement` | same |

---

## Path remapping

Inside HR components, `inAccountant` detects pathname and remaps:

| Manager path | Accountant path |
|--------------|-----------------|
| `/hr/directory` | `/payroll/employees` |
| `/hr/registration` | `/payroll/employees/import` |
| `/hr/directory/:id` | `/payroll/employees/:id` |
| `/hr/leave` | `/payroll/leave` |

---

## Accountant-specific import behavior

**Full import UI guide:** [../hr-center/employee-import-registration.md](../hr-center/employee-import-registration.md)

**Employee Import** (`EmploymentRegistration` in accountant context):

- Default import profile: **minimal** (payroll roster columns)
- Template download: **Payroll import template** with allowance columns:
  - Allowance Each (T/H/Others)
  - Transport Allowance (T/A)
  - Housing Allowance (H/A)
  - Others Allowance
- Upsert by National ID / RSSB — updates existing payroll fields
- Full HR wizard still available for complete registration

**Critical payroll fields on import:**

- Basic Salary, RSSB Number, National ID
- Payment Method, Bank Name, Account Number, Account Holder
- Position Code, Department, Contract Type, Start Date

---

## Employee Directory (accountant view)

Same features as Manager HR Directory:

- Search, filters, export XLSX, bulk delete
- View profile → payroll tab shows basic salary & bank info
- Edit → wizard step 3 has payment details

See full HR docs: [../hr-center/README.md](../hr-center/README.md)

---

## Leave Management

**Route:** `/payroll/leave` — **not in sidebar** but routed.

- Approve/reject leave affects attendance/payroll eligibility (backend)
- Link from employee profile `?staff=id`

See [../hr-center/06-leave-management.md](../hr-center/06-leave-management.md)

---

## Developer notes

- Changes to HR pages affect **both** Manager and Accountant portals
- Test both path remaps when editing `routePath()` helpers
- Payroll-specific fields live on staff user + `hr_profile` JSON

---

## Related

- [02-staff-salary-setup](./02-staff-salary-setup.md) — after employees exist
- [../hr-center/03-employee-registration.md](../hr-center/03-employee-registration.md)
