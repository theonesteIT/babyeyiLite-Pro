# Staff Documents

**Route:** `/manager/hr/documents`  
**Component:** `StaffDocuments.jsx`

---

## Purpose

Central document repository and **compliance tracking** — see who has uploaded required HR files.

---

## Layout & design

```
┌ HERO ─ KPI: Total | Verified | Pending | Missing staff ──────┐
├ Search bar ────────────────────────────────────────────────────┤
├ Staff compliance cards (2-col grid, paginated 6/page) ─────────┤
├ Category filter pills ─────────────────────────────────────────┤
├ Document repository grid (3-col, paginated 9/page) ────────────┤
└ Toast notifications ───────────────────────────────────────────┘
```

---

## Features

### KPI tiles (live)

| KPI | Description |
|-----|-------------|
| Total docs | All uploaded files in repository |
| Verified | Files with server path (complete) |
| Pending | Files awaiting review / no path |
| Missing staff | Employees missing required docs |

### Required documents

Tracked for compliance:

1. **CV**
2. **National ID**
3. **Contract**

### Staff compliance cards

Per employee:

| Element | Description |
|---------|-------------|
| Name + employee ID | Header |
| Badge | “Complete” or “N missing” |
| Uploaded count | Green stat |
| Missing count | Amber stat |
| Uploaded doc badges | List of present doc types |
| Missing required badges | Red tags for gaps |
| **View profile** | Opens employee profile |
| **Upload/replace** | Opens edit wizard |

### Document repository

All files across staff, flattened from `hr_profile.documents`.

**Each document card:**

- File type icon (PDF, DOC, image, generic)
- Filename + employee name
- Category + Verified/Pending badge
- Hover actions: Preview (→ profile), Download, Replace

### Category filters

Dynamic pills from uploaded categories:

CV, Application Letter, National ID, Degree, Contract, Passport, Certificates, Other

### Search

Matches employee name, ID, filename, or category.

### Pagination

- Staff cards: 6 per page
- Documents: 9 per page

---

## Document types (labels)

| Key | Label |
|-----|-------|
| cv | CV |
| application_letter | Application Letter |
| national_id_copy | National ID |
| degree | Degree |
| contract | Contract |
| passport_copy | Passport |
| certificates | Certificates |
| other | Other |

---

## Related

- [Employee Registration — Step 7](./03-employee-registration.md)
- [Employee Profile — Documents tab](./11-employee-profile.md)
- [HR Dashboard alerts](./01-hr-dashboard.md)
