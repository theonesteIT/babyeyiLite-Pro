# Employee Registration (Multi-Step Wizard)

**Route:** `/manager/hr/registration`  
**Edit route:** `/manager/hr/directory/:employeeId/edit`  
**Component:** `EmploymentRegistration.jsx`

---

## Purpose

Create or update a full employee record through a **7-step wizard**, with optional **Excel bulk import**.

---

## Layout & design

```
┌──────────────── HERO ─────────────────────────────┐
│ Employee Registration / Edit Employee Profile      │
└────────────────────────────────────────────────────┘
┌──────────────── WIZARD PANEL ─────────────────────┐
│ [Download template] [Import from Excel]  (new only) │
│ ●──●──●──●──●──●──●  Horizontal stepper + progress │
│ Step N of 7 — Title + description                  │
│ ┌─────────────────────────────────────────────┐   │
│ │ Step form fields                             │   │
│ └─────────────────────────────────────────────┘   │
│ [Cancel/Previous]              [Next / Review]     │
└────────────────────────────────────────────────────┘
```

- **Stepper:** Clickable steps, checkmarks for completed, gradient progress bar
- **Max width:** `max-w-4xl` centered layout
- **Review modal:** Full summary before submit

---

## 7 wizard steps

### Step 1 — Personal Information

| Field | Required |
|-------|----------|
| Profile photo (JPG/PNG, max 2MB) | Optional |
| Employee number (auto-generated preview) | Auto |
| Gender | ✅ |
| First / Middle / Last name | First & Last ✅ |
| Date of birth | ✅ |
| Father's / Mother's names | Optional |
| Marital status | ✅ |
| Nationality (+ specify if Other) | ✅ |
| Birth country (+ specify if Other) | Optional |
| Place of birth (Village, Cell, Sector, District, Province) | Province ✅ |

### Step 2 — Current Residence

| Field | Required |
|-------|----------|
| Residence (Village, Cell, Sector, District, Province) | Province ✅ |
| Email | Optional |
| Phone | ✅ |
| Alternative phone | Optional |

### Step 3 — Personal Identification

**IDs:**

| Field | Required |
|-------|----------|
| National ID / Passport | ✅ |
| RSSB number | Optional |
| Medical insurance | Optional |
| TIN number | Optional |

**Payment (toggle Bank vs Mobile Money):**

| Bank | Mobile Money |
|------|--------------|
| Bank name (Rwanda banks list) | MTN MoMo / Airtel Money |
| Account number | Mobile money number |
| Account holder name | |

### Step 4 — Next of Kin

| Field | Required |
|-------|----------|
| Full name | ✅ |
| Relationship (+ Other specify) | ✅ |
| Phone | ✅ |
| Email | Optional |
| Address | Optional |

### Step 5 — Qualifications *(includes employment)*

**Employment:**

| Field | Required |
|-------|----------|
| Department | ✅ |
| Position (portal role codes) | ✅ |
| Custom position text (if Others) | ✅ |
| Contract type | ✅ |
| Start date | ✅ |
| End date OR “Ongoing contract” checkbox | Optional |

**Qualifications (repeatable):**

- Level: A1, A2, Diploma, Bachelor's, Master's, PhD
- Institution, Year, Grade
- Add / Remove rows

**Experience (repeatable):**

- Employer, Position, Years
- Add / Remove rows

**Smart behavior:** Selecting portal roles (Teacher, Accountant, DOS, etc.) auto-enables Step 6 system access and suggests username/password.

### Step 6 — System Access & Login

| Feature | Description |
|---------|-------------|
| Enable system access checkbox | Optional portal account |
| Login email | ✅ if enabled |
| Username | ✅ + auto-suggest button |
| Temporary password | ✅ on create |
| Confirm password | ✅ |
| Generate secure password | One-click |
| Send welcome email | Checkbox (default on) |

### Step 7 — Documents & Review

| Document | Required |
|----------|----------|
| CV / Resume | ✅ |
| Application Letter | Optional |
| National ID Copy | Optional |
| Degree / Certificate | Optional |
| Signed Contract | Optional |
| Passport Copy | Optional |
| Professional Certificates | Optional |
| Other Attachments | Optional |

- Accept: PDF, JPG, PNG, DOC, DOCX — max 5MB
- Upload / Replace per document type
- Final **Review & submit** opens summary modal

---

## Bulk import (Excel)

> **Full UI & workflow guide:** [employee-import-registration.md](./employee-import-registration.md)

Available on registration page (not in edit mode).

### Import toolbar

| Action | Description |
|--------|-------------|
| Download import template | Full HR template |
| Import from Excel | Opens wide modal |
| Sample CSV (public) | `/hr-employee-import-minimal.csv` |
| Minimal template | Quick payroll roster |
| Full template | All HR columns |

### Import modal features

| Feature | Description |
|---------|-------------|
| **File upload** | `.xlsx`, `.xls`, `.csv` |
| **Column matching** | Flexible header aliases (RSSB, Basic Salary, etc.) |
| **Dry run** | Validate only — counts ready / incomplete / duplicate |
| **Import / update** | Creates new + updates existing (National ID match) |
| **Duplicate handling** | In-file dupes blocked; system matches → update |
| **Update existing** | Upsert by National ID / RSSB / phone / email |
| **Delete & re-import** | Remove old record then import fresh |
| **Remove duplicate rows** | Strip dupes from preview |
| **Failed rows export** | Download `.xlsx` of errors |
| **Incomplete warnings** | Missing fields listed per row (still may import) |

### Import profiles

- **Full** — all HR template columns
- **Minimal** — payroll-focused (accountant portal variant includes allowance columns)

### Allowance columns (accountant)

- Allowance Each (T/H/Others) or separate Transport, Housing, Others

---

## Edit mode

Same wizard pre-filled from `hrService.getEmployee()`. Title changes to **Edit Employee Profile**. Import buttons hidden.

---

## Submit flow

1. **Review & submit** → modal with section summaries
2. Creates via `staffService` or updates via `hrService.updateEmployee()`
3. Uploads profile photo + document files
4. Redirects to directory or profile on success

---

## Related

- [Employee Directory](./02-employee-directory.md)
- [Employee Profile](./11-employee-profile.md)
- [Staff Documents](./09-staff-documents.md)
