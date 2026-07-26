# Employee Profile (View)

**Route:** `/manager/hr/directory/:employeeId`  
**Component:** `EmployeeProfile.jsx`

Opened when clicking **View** or **View profile** from the directory, documents, qualifications, org chart, or contracts.

---

## Purpose

Full 360° employee view — personal data, employment, payroll, documents, leave, access, and quick HR actions.

---

## Layout & design

```
┌ Breadcrumb: Directory › Employee Profile ─── [Edit] [Actions ▼] ┐
├──────────────── HERO ───────────────────────────────────────────┤
│  Photo + camera edit │ Name, badge, ID, position               │
│  Join / Email / Phone / Address mini-cards                      │
│  Employment summary sidebar                                     │
├ STICKY TAB BAR (horizontal scroll) ─────────────────────────────┤
│ Overview | Personal | Employment | Contract | … | More          │
├ TAB CONTENT ────────────────────────────────────────────────────┤
```

- **Font:** Montserrat
- **Background:** `bg-slate-50`
- **Hero:** White card, rounded-2xl photo, green dot if Active
- **Tabs:** Sticky top, ochre underline on active tab
- **Section cards:** White `rounded-2xl`, icon header, label/value rows

---

## Header actions

| Button | Action |
|--------|--------|
| **Edit profile** | Opens edit wizard |
| **Actions dropdown** | Quick action menu (see below) |

---

## 13 profile tabs

### 1. Overview (default)

Two-column dashboard:

**Left (wide):**

| Section | Fields shown |
|---------|--------------|
| Personal Information | Full name, DOB, gender, marital status, nationality, ID, phone, email, address |
| Employment Information | Department, position, category, type, status, hire date, contract end, years of service |
| Next of Kin | Name, relationship, phone, address — or “Not provided” warning |
| Emergency Contact | Same — or prompt to add via edit |
| Bank Information | Bank name, account, holder, mobile money, payment method |
| Employment History | Table: position, department, type, from, to, duration, note (current + prior experience) |

**Right (sidebar):**

| Section | Content |
|---------|---------|
| Salary Information | Basic salary (RWF/month), links to salary certificate & payroll tabs |
| Quick Actions | 7 action buttons (grid) |
| Documents preview | Up to 4 docs with preview eye icon + “View all” |

### 2. Personal Information

Extended fields: first/middle/last name, parents' names, birth country, place of birth, alt phone, national ID.

### 3. Employment

Employee ID, department, sub-department, position, role, employment type, status, hire date, years of service.

### 4. Contract

- Contract type, start, end, ongoing flag
- **Smart alerts:** No end date / expired / expiring within 30 days (color-coded banner)

### 5. Qualifications

Cards per qualification: level, institution, year, grade. Empty state → link to edit.

### 6. System Access

- Portal enabled/disabled badge
- Login email, username
- Password policy note (never shown after creation)
- **Open login page** (external link)
- **Manage access** → edit wizard
- Empty state → **Enable portal access** CTA

### 7. Documents

Grid of document cards with file type badge (PDF/IMG/DOC):

- Preview (in-modal: iframe for PDF, image viewer, or download link)
- Download
- Replace → edit wizard

Document types: CV, Application Letter, National ID, Degree, Contract, Passport, Certificates, Other.

### 8. Attendance

Placeholder with link to **Staff daily attendance** (`/attendance/morning/staff`).

### 9. Leave

| Block | Content |
|-------|---------|
| Balance cards | Annual entitlement, Used, Remaining (days) |
| Leave requests table | Type, from, to, days, status |
| Register leave | Link to leave page with `?staff=id` |

### 10. Payroll

- Payroll & payment info rows
- Embedded **Salary Certificate** preview (compact, with download/print)

### 11. Salary Certificate

Full-page `SalaryCertificateView` with actions (PDF/print).

### 12. Performance

Placeholder — “Performance tracking not configured.”

### 13. More

RSSB, TIN, medical insurance, user UID, portal active flag.

---

## Quick actions (Overview + Actions menu)

| Action | Behavior |
|--------|----------|
| Edit profile | Edit wizard |
| Assign leave | Leave page with staff pre-selected |
| Record attendance | Staff morning attendance |
| Upload document | Switches to Documents tab |
| Transfer employee | Edit wizard |
| Promote employee | Edit wizard |
| Deactivate employee | Confirm → disables portal access |

---

## Document preview modal

- Wide modal
- PDF → iframe embed
- Images → inline display
- Other → open/download link

---

## Related

- [Employee Directory](./02-employee-directory.md)
- [Employee Registration](./03-employee-registration.md)
- [Leave Management](./06-leave-management.md)
