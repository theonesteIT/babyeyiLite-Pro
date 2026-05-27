# Babyeyi API Reference

**Service:** Babyeyi API Server  
**Version:** 2.3.0 (see `backend/server.js`)  
**Base URL (local default):** `http://localhost:5100`

This document catalogs HTTP endpoints exposed by the Express backend. It is generated from the route modules mounted in `backend/server.js` and the corresponding router definitions.

---

## Table of contents

1. [Conventions](#conventions)
2. [Authentication & session](#authentication--session)
3. [Health & discovery](#health--discovery)
4. [Auth (`/api/auth`)](#auth-apiauth)
5. [Session (`/api/session`)](#session-apisession)
6. [Babyeyi core (`/api/babyeyi`)](#babyeyi-core-apibabyeyi)
7. [District / DEO Babyeyi (`/api/district/babyeyi`)](#district--deo-babyeyi-apidistrictbabyeyi)
8. [NESA Babyeyi (`/api/nesa/babyeyi`)](#nesa-babyeyi-apinesababyeyi)
9. [Fee limits (`/api/fee-limits`)](#fee-limits-apifee-limits)
10. [Requirement prices (`/api/requirement-prices`)](#requirement-prices-apirequirement-prices)
11. [Public school registration (`/api/public/schools`)](#public-school-registration-apipublicschools)
12. [Public Babyeyi pay (`/api/public/babyeyi-pay`)](#public-babyeyi-pay-apipublicbabyeyi-pay)
13. [Public pay by student/school code (`/api/public/public-pay`)](#public-pay-by-studentschool-code-apipublicpublic-pay)
14. [Locations (`/api/locations`)](#locations-apilocations)
15. [Schools admin (`/api/schools`, `/api/locations/...`)](#schools-admin-apischools-apilocations)
16. [Students (`/api/students`)](#students-apistudents)
17. [School staff (`/api/school/staff`)](#school-staff-apischoolstaff)
18. [Accountant (`/api/accountant`)](#accountant-apiaccountant)
19. [Discipline (`/api/discipline`)](#discipline-apidiscipline)
20. [DOS academic (`/api/dos`)](#dos-academic-apidos)
21. [Student transfers (`/api/student-transfers`)](#student-transfers-apistudent-transfers)
22. [Parent portal & public parent APIs](#parent-portal--public-parent-apis)
23. [Mini websites (`/api/mini-websites`)](#mini-websites-apimini-websites)
24. [Admissions (`/api/admissions`)](#admissions-apiadmissions)
25. [Static uploads](#static-uploads)
26. [Rate limiting (selected paths)](#rate-limiting-selected-paths)
27. [Notifications (Web Push, Email, In-App)](#notifications-web-push-email-in-app)
28. [Postman collection & sync](#postman-collection--sync)
29. [Combined tuition pay — USSD guide](#combined-tuition-pay--ussd-guide)

---

## Conventions

| Item | Notes |
|------|--------|
| **JSON** | Most APIs use `Content-Type: application/json` unless noted (multipart for uploads). |
| **Responses** | Common shape: `{ success: boolean, message?: string, data?: ... }` (exact fields vary by route). |
| **Errors** | `4xx` / `5xx` with JSON body; development may include `stack` on unhandled errors. |
| **IDs** | Numeric IDs in path segments unless documented otherwise. |

**Mount order:** Several routers attach to the same prefix (e.g. three routers on `/api/babyeyi`). Express matches the first registered handler; DEO-specific paths are mounted before the main Babyeyi router by design.

---

## Authentication & session

| Mechanism | Detail |
|-----------|--------|
| **Session cookie** | `babyeyi_sid` — httpOnly, set on login. Send with `credentials: 'include'` from browsers. |
| **Hydration** | `server.js` loads `req.user` from the database when `req.session.userId` is present. |
| **Role checks** | Many routes use `requireRole([...])` from `middleware/deoAuth.js` (and similar patterns). |

Unauthenticated calls to protected routes typically receive `401` or `403` with a JSON message.

---

## Health & discovery

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Service metadata and high-level route map. |
| GET | `/api/health` | No | Liveness; uptime and environment warnings. |
| GET | `/api/metrics` | No | Prometheus-style metrics (if enabled). |

---

## Auth (`/api/auth`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | Stricter rate limit. |
| GET | `/api/auth/verify` | Session / token verification helper. |
| POST | `/api/auth/signup-super-admin` | Initial Super Admin setup. |
| POST | `/api/auth/create-school` | Super Admin — create school + manager. |
| GET | `/api/auth/schools` | List schools (admin context). |
| POST | `/api/auth/create-nesa-admin` | Super Admin. |
| GET | `/api/auth/nesa-admins` | List NESA admins. |
| PUT | `/api/auth/nesa-admin/:id` | Update NESA admin. |
| DELETE | `/api/auth/nesa-admin/:id` | Remove NESA admin. |
| POST | `/api/auth/create-deo` | Super Admin — create DEO user. |
| GET | `/api/auth/deo-admins` | List DEO admins. |
| PUT | `/api/auth/deo-admin/:id` | Update DEO admin. |
| DELETE | `/api/auth/deo-admin/:id` | Remove DEO admin. |
| POST | `/api/auth/forgot-password` | Password reset request (rate limited). |
| POST | `/api/auth/reset-password` | Complete reset. |
| PUT | `/api/auth/change-password` | Authenticated password change. |
| POST | `/api/auth/profile/photo` | Multipart — field `photo`. |

---

## Session (`/api/session`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/session/me` | Optional | Current user payload or `data: null`. |
| POST | `/api/session/logout` | Session | Destroy session and clear cookie. |

---

## Babyeyi core (`/api/babyeyi`)

**Routers (in order):** `babyeyi-deo.js` → `babyeyi.js` → `babyeyi-hash-patch.js`.

### DEO paths (same prefix, registered first)

| Method | Path | Middleware | Description |
|--------|------|------------|-------------|
| GET | `/api/babyeyi/requests` | DEO session | DEO increase / request listing. |
| GET | `/api/babyeyi/schools` | DEO session | Schools in scope for DEO. |
| GET | `/api/babyeyi/monitoring` | DEO session | Monitoring data. |
| GET | `/api/babyeyi/deo/stats` | DEO session | DEO statistics. |
| PUT | `/api/babyeyi/requests/:id/review` | DEO session | Review / decision on request. |

### Main Babyeyi (`babyeyi.js`)

Public or conditionally public (see middleware in file: e.g. `GET /verify/:docId`, `GET /` with `?school_id=`, `GET /:id` and `GET /:id/qrcode` for approved public views).

| Method | Path | Typical auth | Description |
|--------|------|----------------|-------------|
| GET | `/api/babyeyi/school-info` | Yes | School profile for logged-in school context. |
| POST | `/api/babyeyi/upload-asset` | Yes | Multipart asset upload. |
| GET | `/api/babyeyi/nesa-limit` | Yes | NESA limit helper. |
| GET | `/api/babyeyi/student-requirements-catalog` | Yes | Requirements catalog. |
| GET | `/api/babyeyi/debug-hash/:id` | Yes | Debug (development-oriented). |
| GET | `/api/babyeyi/verify/:docId` | Public | Document verification. |
| GET | `/api/babyeyi/stats` | Yes | Aggregated stats. |
| GET | `/api/babyeyi/` | Mixed | List; public when `school_id` query is used (approved-only filtering in handler). |
| GET | `/api/babyeyi/requests` | Yes | *If reached* — note: may be shadowed by DEO router for same path; prefer DEO base for DEO flows. |
| GET | `/api/babyeyi/:id` | Mixed | Single Babyeyi document. |
| POST | `/api/babyeyi/` | Yes | Create Babyeyi. |
| POST | `/api/babyeyi/:id/regenerate-docs` | Yes | Regenerate documents. |
| GET | `/api/babyeyi/:id/qrcode` | Mixed | QR resource. |
| POST | `/api/babyeyi/:id/qrcode` | Yes | Generate / set QR. |
| PUT | `/api/babyeyi/:id` | Yes | Full update. |
| DELETE | `/api/babyeyi/:id` | Yes | Delete. |
| PATCH | `/api/babyeyi/:id/district-approve` | Yes | Workflow. |
| PATCH | `/api/babyeyi/:id/district-recommend` | Yes | Workflow. |
| PATCH | `/api/babyeyi/:id/nesa-approve` | Yes | Workflow. |
| PATCH | `/api/babyeyi/:id/nesa-reject` | Yes | Workflow. |
| PATCH | `/api/babyeyi/:id/district-reject` | Yes | Workflow. |
| POST | `/api/babyeyi/:id/submit-request` | Yes | Submit fee-increase request. |
| GET | `/api/babyeyi/pdf/:docId` | Yes | PDF by doc id. |
| GET | `/api/babyeyi/:id/pdf` | Yes | PDF for Babyeyi id. |
| GET | `/api/babyeyi/:id/leaders` | Yes | Leaders list. |
| POST | `/api/babyeyi/:id/leaders` | Yes | Add leader. |
| PUT | `/api/babyeyi/:id/leaders/:leaderId` | Yes | Update leader. |
| DELETE | `/api/babyeyi/:id/leaders/:leaderId` | Yes | Remove leader. |

### Hash patch fallback

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/babyeyi/verify/:docId` | Alternate / fallback verification handler. |

---

## District / DEO Babyeyi (`/api/district/babyeyi`)

All routes use `deoAuth` middleware (district education officer context).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/district/babyeyi/me` | Current DEO profile. |
| GET | `/api/district/babyeyi/stats` | District stats. |
| GET | `/api/district/babyeyi/analytics` | Analytics. |
| GET | `/api/district/babyeyi/list` | Babyeyi list for district. |
| GET | `/api/district/babyeyi/increase-requests` | Fee increase requests. |
| GET | `/api/district/babyeyi/schools/list` | Schools list. |
| GET | `/api/district/babyeyi/deo-assets` | Asset metadata. |
| POST | `/api/district/babyeyi/deo-assets` | Multipart — signature/stamp fields. |
| GET | `/api/district/babyeyi/:id` | Single record. |
| PATCH | `/api/district/babyeyi/:id/approve` | Approve (multipart-capable). |
| PATCH | `/api/district/babyeyi/:id/reject` | Reject (multipart-capable). |
| PATCH | `/api/district/babyeyi/:id/recommend` | Recommend (multipart-capable). |

---

## NESA Babyeyi (`/api/nesa/babyeyi`)

Router applies `nesaAuth`: roles include `NESA_ADMIN`, `NESA_OFFICER`, `SUPER_ADMIN`, `ADMIN`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/nesa/babyeyi/stats` | National stats. |
| GET | `/api/nesa/babyeyi/analytics` | Analytics. |
| GET | `/api/nesa/babyeyi/requests` | Filterable request list. |
| GET | `/api/nesa/babyeyi/requests/:id` | Request detail. |
| GET | `/api/nesa/babyeyi/violations` | Schools exceeding limits. |
| PATCH | `/api/nesa/babyeyi/requests/:id/approve` | NESA approve. |
| PATCH | `/api/nesa/babyeyi/requests/:id/reject` | NESA reject. |
| GET | `/api/nesa/babyeyi/notifications` | Notifications. |

---

## Fee limits (`/api/fee-limits`)

NESA fee-limit CRUD. Routes use `req.user` for audit fields where present; enforce appropriate network/session policies in production.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fee-limits/stats` | Summary counts. |
| GET | `/api/fee-limits/` | Paginated list (query filters). |
| GET | `/api/fee-limits/audit/:id` | Audit log for a record. |
| GET | `/api/fee-limits/:id` | Single active record. |
| POST | `/api/fee-limits/` | Create (multipart: `regulation_pdf`). |
| PUT | `/api/fee-limits/:id` | Replace. |
| PATCH | `/api/fee-limits/:id` | Partial update. |
| DELETE | `/api/fee-limits/:id` | Soft-delete (`is_active = 0`). |

---

## Requirement prices (`/api/requirement-prices`)

**Global middleware:** `SUPER_ADMIN` only.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/requirement-prices/options` | Dropdown / filter data. |
| GET | `/api/requirement-prices/list` | Priced rows list. |
| DELETE | `/api/requirement-prices/by-class` | Delete by class scope (query/body per implementation). |
| GET | `/api/requirement-prices/requirements` | Requirements listing. |
| PUT | `/api/requirement-prices/catalog-defaults` | Catalog defaults. |
| POST | `/api/requirement-prices/requirements/:id/image` | Multipart image for catalog item. |
| DELETE | `/api/requirement-prices/requirements/:id/image` | Remove image. |
| GET | `/api/requirement-prices/browse/schools` | Browse schools. |
| GET | `/api/requirement-prices/browse/school-babyeyi` | Browse school Babyeyi. |
| GET | `/api/requirement-prices/browse/babyeyi-detail/:babyeyiId` | Detail for pricing UI. |
| POST | `/api/requirement-prices/requirements` | Create requirement definition. |
| PUT | `/api/requirement-prices/requirements/:id` | Update requirement. |
| DELETE | `/api/requirement-prices/requirements/:id` | Delete requirement. |
| GET | `/api/requirement-prices/` | Root list. |
| POST | `/api/requirement-prices/` | Create price row (see handler). |
| GET | `/api/requirement-prices/:id` | Single row. |
| PUT | `/api/requirement-prices/:id` | Update row. |
| DELETE | `/api/requirement-prices/:id` | Delete row. |

---

## Public school registration (`/api/public/schools`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/public/schools/next-school-code` | No | Next numeric code; optional `?district=`. |
| POST | `/api/public/schools/register` | No | Multipart — `logo`, `headSignature`, `stamp`. |
| POST | `/api/public/schools/claim` | No | Claim flow for existing pre-registered school. |
| GET | `/api/public/schools/` | No | List schools by `province`, `district`, `sector` (required query params). |

---

## Public Babyeyi pay (`/api/public/babyeyi-pay`)

Also mounted at `/api/parent-portal/public/babyeyi-finder/*` (same handlers).

**Guest pay flow (PublicPage → `/combined-tution-requrement`):**

1. `POST /api/public/public-pay/student-catalog` — resolve student + school + Babyeyi combinations  
2. `GET /api/public/babyeyi-pay/pricing/:babyeyiId?school_id=` — fees, requirements, **`combined_total_rwf`**  
3. `POST /api/public/babyeyi-pay/quote-balance` — remaining balance for selection  
4. `POST /api/public/babyeyi-pay/intent` — create payment (MoMo, bank, loan, etc.)  
5. `POST /api/public/babyeyi-pay/intent/:id/check-provider-status` — poll provider  

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/public/babyeyi-pay/` | No | Discovery JSON (steps + aliases). |
| GET | `/api/public/babyeyi-pay/pricing/:babyeyiId` | No | Pricing; query **`school_code`** (preferred, e.g. `003`) or `school_id` (numeric). |
| POST | `/api/public/babyeyi-pay/quote-balance` | No | Remaining RWF; body **`school_code`** or `school_id`, plus `babyeyi_id`, fee/requirement selections. |
| POST | `/api/public/babyeyi-pay/intent` | No | Payment intent; body accepts **`school_code`** or `school_id`. |
| GET | `/api/public/babyeyi-pay/shule-avance-organizations` | No | Active Shule Avance partners for checkout. |
| POST | `/api/public/babyeyi-pay/intent` | No | Payment / loan intent (creates invoice). |
| POST | `/api/public/babyeyi-pay/intent/:id/check-provider-status` | No | Poll MoMo / XentriPay status. |
| POST | `/api/public/babyeyi-pay/webhook/xentripay` | Token | XentriPay callback. |
| GET | `/api/public/babyeyi-pay/invoices/verify/:id` | No | Public invoice authenticity (`?invoice_no=`). |
| GET | `/api/public/babyeyi-pay/receipt/:id.pdf` | No | Paid receipt PDF (`?invoice_no=`). |
| GET | `/api/public/babyeyi-pay/invoice/:id.pdf` | No | Invoice PDF. |
| GET | `/api/public/babyeyi-pay/invoices` | School session | List invoices. |
| GET | `/api/public/babyeyi-pay/invoices/:id/detail` | School session | Intent + lines JSON. |
| GET | `/api/public/babyeyi-pay/invoices/:id/print.pdf` | School session | Printable invoice. |
| GET | `/api/public/babyeyi-pay/invoices/export.xlsx` | School session | Export. |
| GET | `/api/public/babyeyi-pay/invoices/export.pdf` | School session | Export PDF. |
| POST | `/api/public/babyeyi-pay/invoices` | School session | Manual invoice create. |
| PATCH | `/api/public/babyeyi-pay/invoices/:id` | School session | Update invoice. |
| DELETE | `/api/public/babyeyi-pay/invoices/:id` | School session | Delete invoice. |
| GET | `/api/public/babyeyi-pay/admin-intents` | `SUPER_ADMIN` | Admin list. |
| GET | `/api/public/babyeyi-pay/admin-intents/filters` | `SUPER_ADMIN` | Filter options. |
| GET | `/api/public/babyeyi-pay/admin-intents/export.csv` | `SUPER_ADMIN` | CSV export. |
| GET | `/api/public/babyeyi-pay/admin-intents/:id/detail` | `SUPER_ADMIN` | Intent detail. |
| PUT | `/api/public/babyeyi-pay/admin-intents/:id/status` | `SUPER_ADMIN` | Status update. |
| PUT | `/api/public/babyeyi-pay/admin-loan-repayments/:id/review` | `SUPER_ADMIN` | Repayment review. |
| PUT | `/api/public/babyeyi-pay/admin-intents/:id/loan-extension` | `SUPER_ADMIN` | Loan extension. |
| POST | `/api/public/babyeyi-pay/admin-invoices/reminders/run` | School admin | Unpaid reminders job. |

---

## Public pay by student/school code (`/api/public/public-pay`)

Used by **PublicPage** (school fallback), **PaidAtSchool** / **combined-tution-requrement**, and pay-by-class flows.

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| GET | `/api/public/public-pay` | No | — | Discovery: lists `student-catalog`, `school-catalog`, `class-pricing`, `search-student`, `intent`. |
| POST | `/api/public/public-pay/student-catalog` | No | `{ "code": "UID \| student_code \| sdm_code" }` | School + student + Babyeyi rows for student's class; sets default term/year. |
| POST | `/api/public/public-pay/school-catalog` | No | `{ "school_code": "directory code" }` | School + all class/term/year combinations (no student). |
| POST | `/api/public/public-pay/class-pricing` | No | `school_code`, `class_name`, optional `academic_year`, `term` | Tuition + requirements + **`combined_total_rwf`**. |
| POST | `/api/public/public-pay/search-student` | No | `school_code`, optional `babyeyi_id`, `code` / `student_uid` / `sdm_code` | Student at school + pricing + `next_step` hints for intent. |

**Related (parent portal, no login):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/public/student-code-lookup` | PublicPage AI search; returns `{ found, data }` (no pricing). |
| POST | `/api/parent-portal/public/babyeyi-finder/student-lookup` | Same handler as `student-code-lookup`. |

---

## Locations (`/api/locations`)

Served by `locationsRoutes/locationRoutes.js` when the `rwanda` package is installed; otherwise `503` placeholder.

| Method | Path |
|--------|------|
| GET | `/api/locations/provinces` |
| GET | `/api/locations/districts` |
| GET | `/api/locations/sectors` |
| GET | `/api/locations/cells` |
| GET | `/api/locations/villages` |
| GET | `/api/locations/all` |
| GET | `/api/locations/all/provinces` |
| GET | `/api/locations/all/districts` |
| GET | `/api/locations/all/sectors` |
| GET | `/api/locations/all/cells` |
| GET | `/api/locations/all/villages` |
| GET | `/api/locations/search` |
| GET | `/api/locations/stats` |

---

## Schools admin (`/api/schools`, `/api/locations/...`)

Mounted from `school-add.js` on `/api` (same router exposes both `/schools/*` and duplicate location helpers under `/locations/*` for legacy callers).

**Schools**

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/schools/check-code` | Validation helper. |
| GET | `/api/schools/check-username` | Validation helper. |
| GET | `/api/schools/check-email` | Validation helper. |
| GET | `/api/schools/next-school-code` | Next code. |
| GET | `/api/schools` | Paginated list + filters. |
| GET | `/api/schools/districts` | Districts used by schools. |
| POST | `/api/schools/skeleton` | Minimal shell school (public registration flow). |
| POST | `/api/schools` | Multipart create (Super Admin style). |
| POST | `/api/schools/bulk-delete` | Bulk delete. |
| GET | `/api/schools/:id` | Detail. |
| GET | `/api/schools/:id/summary` | Summary. |
| PUT | `/api/schools/:id` | Update (multipart-capable). |
| PUT | `/api/schools/:id/status` | Status change. |
| POST | `/api/schools/:id/logo` | Multipart `logo`. |
| POST | `/api/schools/:id/signature` | Multipart `headSignature`. |
| POST | `/api/schools/:id/stamp` | Multipart `stamp`. |
| DELETE | `/api/schools/:id` | Soft delete. |

**Locations (duplicate under `/api` from `school-add.js`)**

| Method | Path |
|--------|------|
| GET | `/api/locations/provinces` |
| GET | `/api/locations/districts` |
| GET | `/api/locations/sectors` |
| GET | `/api/locations/cells` |

*Note:* If `locationRoutes.js` is active, `/api/locations` is registered **before** `school-add.js`; those paths hit the Rwanda dataset module first.

---

## Students (`/api/students`)

Roles (abbreviated): mutations — `SCHOOL_ADMIN`, `SCHOOL_MANAGER`, `ACCOUNTANT`, `DOS`. Listing also allows `HOD` (read-only discipline workflow).

| Method | Path | Roles |
|--------|------|--------|
| GET | `/api/students` | `STUDENT_LIST_ROLES` |
| POST | `/api/students` | `SCHOOL_ROLES` |
| PUT | `/api/students/:id` | `SCHOOL_ROLES` |
| DELETE | `/api/students/:id` | `SCHOOL_ROLES` |
| POST | `/api/students/bulk-delete` | `SCHOOL_ROLES` |
| POST | `/api/students/delete-all` | `SCHOOL_ROLES` |
| GET | `/api/students/export.xlsx` | `SCHOOL_ROLES` |
| GET | `/api/students/export.pdf` | `SCHOOL_ROLES` |
| POST | `/api/students/import` | `SCHOOL_ROLES` — multipart field `file` (Excel). |

---

## School staff (`/api/school/staff`)

| Method | Path | Roles |
|--------|------|--------|
| GET | `/api/school/staff` | `CREATOR_ROLES` (see `schoolStaff.js`) |
| POST | `/api/school/staff` | `CREATOR_ROLES` |

---

## Accountant (`/api/accountant`)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/accountant/overview` | `ACCOUNTANT_ONLY` |
| GET | `/api/accountant/babyeyi-fee` | `ACCOUNTANT_ONLY` |
| GET | `/api/accountant/reports/payments` | `ACCOUNTANT_ONLY` |
| GET | `/api/accountant/reports/payments/export.xlsx` | `ACCOUNTANT_ONLY` |
| GET | `/api/accountant/reports/payments/export.pdf` | `ACCOUNTANT_ONLY` |
| GET | `/api/accountant/payments` | `ACCOUNTANT_ONLY` |
| POST | `/api/accountant/payments` | `ACCOUNTANT_ONLY` |

---

## Discipline (`/api/discipline`)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/discipline/settings` | `HOD_ONLY` |
| PUT | `/api/discipline/settings` | `HOD_ONLY` |
| GET | `/api/discipline/students-summary` | `HOD_ONLY` |
| POST | `/api/discipline/cases` | `HOD_ONLY` |
| GET | `/api/discipline/cases` | `HOD_ONLY` |
| GET | `/api/discipline/report-summary` | `HOD_ONLY` |

---

## DOS academic (`/api/dos`)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/dos/settings` | `DOS_ONLY` |
| PUT | `/api/dos/settings` | `DOS_ONLY` |
| GET | `/api/dos/progress/students` | `DOS_ONLY` |
| POST | `/api/dos/progress` | `DOS_ONLY` |
| GET | `/api/dos/reports/summary` | `DOS_ONLY` |
| GET | `/api/dos/reports/summary/export.xlsx` | `DOS_ONLY` |
| GET | `/api/dos/reports/summary/export.pdf` | `DOS_ONLY` |

---

## Student transfers (`/api/student-transfers`)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/student-transfers/lookup` | `SCHOOL_ADMIN_OR_MANAGER` |
| POST | `/api/student-transfers/request` | `SCHOOL_ADMIN_OR_MANAGER` |
| GET | `/api/student-transfers/my` | `SCHOOL_ADMIN_OR_MANAGER` |
| PUT | `/api/student-transfers/:id/decision` | `SCHOOL_ADMIN_OR_MANAGER` |
| GET | `/api/student-transfers/notifications/unread-count` | `SCHOOL_ADMIN_OR_MANAGER` |

---

## Parent portal & public parent APIs

Mounted on `/api` from `parentPortal.js`. Selected routes use rate limiting (`checkPhoneLimiter`, `authLimiter`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/parent-portal/check-phone` | No | Phone check (limited). |
| POST | `/api/public/student-code-lookup` | No | Student code lookup (limited). |
| POST | `/api/parent-portal/link-student-by-code` | No | Link student (limited). |
| POST | `/api/parent-portal/register` | No | Register (limited). |
| POST | `/api/parent-portal/login` | No | Login (limited). |
| POST | `/api/parent-portal/phone-login` | No | Phone login (limited). |
| POST | `/api/parent-portal/complete-registration` | No | Complete profile (limited). |
| GET | `/api/parent-portal/admin-upgrades` | `SUPER_ADMIN` | Admin upgrades list. |
| GET | `/api/parent-portal/admin-accounts` | `SUPER_ADMIN` | Accounts list. |
| GET | `/api/parent-portal/admin-accounts/export.csv` | `SUPER_ADMIN` | CSV export. |
| GET | `/api/parent-portal/children` | Parent session | Linked children. |
| GET | `/api/parent-portal/classkit-pricing` | Parent session | Pricing for class kit. |
| GET | `/api/parent-portal/payments-report` | Parent session | Payments report. |
| GET | `/api/parent-portal/payments-report/export.csv` | Parent session | CSV export. |
| GET | `/api/parent-portal/loan-intents/:id/detail` | Parent session | Loan intent detail. |
| POST | `/api/parent-portal/loan-intents/:id/pay` | Parent session | Pay against intent. |
| GET | `/api/parent-portal/loan-repayments/:id/receipt` | Parent session | Receipt. |

---

## Mini websites (`/api/mini-websites`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/mini-websites/school/:schoolId` | Public / wizard loader. |
| GET | `/api/mini-websites/slug/:slug` | Public by slug. |
| POST | `/api/mini-websites/gallery-images` | Multipart gallery upload. |
| GET | `/api/mini-websites/` | List (see controller auth). |
| GET | `/api/mini-websites/filter-options` | Filter metadata. |
| GET | `/api/mini-websites/:miniId` | Single site. |
| POST | `/api/mini-websites/` | Create (multipart fields). |
| PUT | `/api/mini-websites/:miniId` | Update. |
| PATCH | `/api/mini-websites/:miniId/publish` | Publish. |
| PATCH | `/api/mini-websites/:miniId/unpublish` | Unpublish. |
| DELETE | `/api/mini-websites/:miniId` | Delete. |

---

## Admissions (`/api/admissions`)

**Public**

| Method | Path |
|--------|------|
| GET | `/api/admissions/forms/:formId/public` |
| GET | `/api/admissions/forms/:formId/stats` |
| GET | `/api/admissions/slug/:slug` |
| POST | `/api/admissions/forms/:formId/apply` — multipart (dynamic `q_*` file fields) |
| GET | `/api/admissions/track/:referenceNo` |

**School manager (and similar roles — see `requireManager` in file)**

| Method | Path |
|--------|------|
| GET | `/api/admissions/school/:schoolId` |
| POST | `/api/admissions/school/:schoolId` |
| PUT | `/api/admissions/school/:schoolId` |
| PATCH | `/api/admissions/forms/:formId/status` |
| DELETE | `/api/admissions/forms/:formId` |
| GET | `/api/admissions/forms/:formId/applications` |
| GET | `/api/admissions/applications/:appId` |
| PATCH | `/api/admissions/applications/:appId/status` |

---

## Static uploads

| Path | Description |
|------|-------------|
| GET `/uploads/*` | Static files from `backend/uploads` (e.g. logos, PDFs, QR images). |
| GET `/uploads/profile-photos/:filename` | Profile photos with legacy path fallback (see `server.js`). |

---

## Rate limiting (selected paths)

| Scope | Notes |
|-------|--------|
| `/api/*` | General API limiter (see `server.js` — skips selected paths such as `/api/session/me`). |
| `/api/auth/login` | Stricter login attempts limit. |
| `/api/babyeyi/verify` | Dedicated verification limiter. |
| Parent portal routes | Per-route limiters in `parentPortal.js`. |

---

## Notifications (Web Push, Email, In-App)

Postman folder: **`20 - Notifications (Web Push, Email, In-App)`**.

### Web Push (browser subscriptions)

| Portal | VAPID key | Subscribe | Unsubscribe |
|--------|-----------|-----------|-------------|
| Parent | `GET /api/parent-portal/push/vapid-key` | `POST .../push/subscribe` | `POST .../push/unsubscribe` |
| District DEO | `GET /api/district/babyeyi/push/vapid-key` | `POST .../push/subscribe` | `POST .../push/unsubscribe` |
| NESA | `GET /api/nesa/babyeyi/push/vapid-key` | `POST .../push/subscribe` | `POST .../push/unsubscribe` |
| School staff | `GET /api/portal/push/vapid-key` | `POST .../push/subscribe` | `POST .../push/unsubscribe` |

Parent also: `GET .../push/status`, `PATCH .../push/preferences`.

### Email

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/accountant/fee-reminders/campaigns` | Accountant session | Channels: `email`, `sms`, `push`, `in_system` |
| POST | `/api/public/babyeyi-pay/admin-invoices/reminders/run` | School admin | Unpaid invoice email job |

### In-App (database notification feeds)

| Method | Path | Audience |
|--------|------|----------|
| GET | `/api/parent-portal/notifications` | Parent session |
| GET | `/api/district/babyeyi/notifications` | DEO session |
| GET | `/api/nesa/babyeyi/notifications` | NESA session |
| GET | `/api/babyeyi/notifications` | School staff |
| GET | `/api/accountant/action-plans/notifications` | Accountant |
| GET | `/api/library/notifications` | Librarian roles |
| GET | `/api/student-transfers/notifications/unread-count` | School manager |

Mark read: `PATCH .../notifications/:id/read`, `POST .../notifications/read-all` (where implemented).

---

## Postman collection & sync

| Asset | Path |
|-------|------|
| Collection | `docs/postman/BabyeyiSystem.postman_collection.json` |
| Local env | `docs/postman/BabyeyiSystem.local.postman_environment.json` |
| Production env | `docs/postman/BabyeyiSystem.production.postman_environment.json` |

**Folders**

| Folder | Use |
|--------|-----|
| `10b` | Guest Babyeyi Finder (lookup, pricing, intent aliases) |
| `10c` | Public pay — includes **`school-catalog`**, **`student-catalog`**, and **E2E — Combined tuition** (test scripts chain `schoolId` / `babyeyiId`) |
| `12` | Invoices, quote-balance, receipts, webhooks |
| `19 - Backend sync (missing routes)` | Auto-added endpoints not present in folders `00`–`18` |
| `20 - Notifications` | Web Push, Email campaigns, In-App feeds |

**Regenerate after backend changes** (from `docs/postman/`):

```bash
node extract-routes.mjs   # writes _backend_routes.json, _missing_routes.json
node sync-postman.mjs     # updates collection (10c + folder 19)
```

**Collection Runner (guest pay):** Select environment **BabyeyiSystem Local**, set `studentLookupCode`, run folder `10c` → `E2E — Combined tuition` in order.

---

## Maintaining this document

When you add or change routes:

1. Update the relevant router file under `backend/BabyeyiRoutes/` (or `authPages/`, `locationsRoutes/`).
2. If you add a new `app.use` mount, document the prefix here and add the mount to `docs/postman/extract-routes.mjs` → `MOUNTS`.
3. Run `node extract-routes.mjs` and `node sync-postman.mjs` to refresh Postman folder `19`.
4. Edit the tables above for high-traffic or public flows; rely on Postman `19` for exhaustive coverage.

---

## Combined tuition pay — USSD guide

Full step-by-step for telco/USSD integrators (menus, session state, exact HTTP order, payloads):

**[COMBINED_TUITION_PAY_USSD_GUIDE.md](./COMBINED_TUITION_PAY_USSD_GUIDE.md)**

---

*End of API reference.*
