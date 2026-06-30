# Employment Contracts

**Route:** `/manager/hr/contracts`  
**Component:** `EmploymentContracts.jsx`

---

## Purpose

Track contract lifecycle — types, dates, salary, expiry status, and create/update contracts.

---

## Layout & design

```
┌ HERO ─ KPI: Contracts | Expiring | Expired ─ [New contract] ┐
├ Contract notification alerts (manager) ──────────────────────┤
├ Expiring soon / Expired alert panels ────────────────────────┤
├ Filter pills: All | Permanent | Contract | … ────────────────┤
├ Data table (paginated, 10/page) ─────────────────────────────┤
└ Create contract modal ─────────────────────────────────────────┘
```

- Contract type colors: Permanent (green), Contract (ochre), Temporary (orange), etc.
- Status badges: Active, Expiring, Expired

---

## Features

### KPI tiles (live)

| KPI | Description |
|-----|-------------|
| **Contracts** | Total contract records |
| **Expiring** | Ending within 30 days |
| **Expired** | Past end date — needs renewal |

### Manager alerts

- Warning banner listing employees with contracts expiring or expired (up to 4 each)

### Filter by contract type

All, Permanent, Contract, Temporary, Probation, Internship, Part-Time, Consultancy

### Contracts table

| Column | Content |
|--------|---------|
| Contract ID | `CON-{employee_id}` |
| Employee | Name + employee ID |
| Type | Color-coded employment type |
| Position | Job title |
| Start / End | Dates; end shows days left or “Permanent” |
| Salary | Basic salary in RWF |
| Status | Active / Expiring / Expired badge |
| Actions | View, Renew, Extend |

**Row actions:**

- **View** → Employee profile
- **Renew / Extend** → Edit employee wizard

### Create new contract (modal)

| Field | Description |
|-------|-------------|
| Employee search | Typeahead list (top 8 matches) |
| Contract type | Permanent, Temporary, Probation, Internship, Part-Time, Consultancy |
| Position | Job title |
| Start date | Required |
| End date | Optional |
| No end date checkbox | Fixed / permanent — does not expire |
| Duration preview | Calculated days when dates set |
| Salary (RWF) | Basic salary |
| Upload contract PDF | Optional signed contract file |

**Validation:**

- Employee required
- Start date required
- End cannot be before start

Saves via `hrService.updateEmployee()` with optional contract document upload.

### Toast notifications

Success/error feedback after save.

---

## Data source

Built from `hrService.getDirectory()` — maps each employee's contract fields to contract rows with computed status and `daysLeft`.

---

## Related

- [Employee Profile — Contract tab](./11-employee-profile.md)
- [Employee Registration — Step 5](./03-employee-registration.md)
