# TichaAvance — Architecture

## System boundary

TichaAvance is a **backend service module** plus **multiple frontend surfaces**. All authoritative logic lives in `shuleAvanceServices.js`; frontends are thin clients that call `/api/services/shule-avance/*`.

```
┌─────────────────────────────────────────────────────────┐
│  Frontends                                               │
│  ├── teacher-portal/ShuleAvance.jsx                     │
│  ├── LiteTichaAvancePage.jsx                            │
│  ├── staffTichaDeals/* (shared)                         │
│  └── Accountant / Manager approval pages                │
└───────────────────────────┬─────────────────────────────┘
                            │ session cookie
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Express: /api/services  →  shuleAvanceServices.js     │
│  ├── applicant/*     (create, list, eligibility)       │
│  ├── finance/*       (accountant)                       │
│  ├── manager/*       (approval)                         │
│  ├── public/*        (MoMo deal pay, no session)         │
│  └── admin/*         (deal products)                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                     MySQL tables
                  shule_avance_*
```

USSD cashout uses a **parallel entry** via `teacherPortal.js` at `/api/teacher-portal/avance/ussd/*` but writes to the same `shule_avance_requests` table.

---

## Backend file map

| File | Responsibility |
|------|----------------|
| `shuleAvanceServices.js` | Routes, eligibility, request CRUD, approvals, MoMo pay |
| `shuleAvanceCatalogStore.js` | Service + cashout category catalog |
| `shuleAvanceOrgPortal.js` | Financing partner dashboard API |
| `shuleAvanceOrgSchema.js` | Partner organization tables |
| `teacherPortal.js` | USSD login/cashout/list |
| `webPushSubscriptions.js` | Push delivery (tag `ticha-avance`) |
| `publicBabyeyiPay.js` | Babyeyi Pay financing intents |
| `schoolStaff.js` | School advance policy endpoint |

Migration: `migrations/20260505100000_shule_avance_org_schema.js`

---

## Database tables

| Table | Purpose |
|-------|---------|
| `shule_avance_requests` | All requests (cashout, service, deals) |
| `shule_avance_teacher_catalog` | Service + cashout categories, interest rates |
| `shule_avance_teacher_deal_products` | TichaDeals product catalog |
| `shule_avance_teacher_deal_pay_tokens` | Short-lived MoMo payment tokens |
| `shule_avance_teacher_deal_pay_alt_intents` | Alternate payment channel intents |
| `pro_shule_avance_organizations` | External financing partners |
| `pro_shule_avance_applications` | Legacy applications |
| `teacher_avance_ussd_sessions` | USSD bearer tokens |
| `web_push_subscriptions` | Push endpoints per user |
| `schools.shule_avance_max_percent` | Per-school monthly cap (default **25%**) |

### `shule_avance_requests` key fields

| Field | Values / notes |
|-------|----------------|
| `request_type` | `cashout` \| `service` |
| `service_category` | e.g. `teacher_deals`, `cash_power`, `airtime_data` |
| `status` | See workflow doc |
| `amount_rwf` | Requested amount |
| `repayment_term_months` | 1–18 (UI options) |
| `auto_approved` | Boolean for instant cashout |
| `net_salary_baseline_rwf` | Net salary at submission |
| `monthly_requested_total_rwf` | Running monthly total |
| `deal_products_snapshot_json` | TichaDeal line items |

---

## Role matrix

| Role group | Roles | Access |
|------------|-------|--------|
| **Applicants** | `TEACHER`, `HOD`, `DOS`, `ACCOUNTANT`, `LIBRARIAN`, `STOREKEEPER`, `DISCIPLINE*`, `GATE_*`, `SECRETARY`, `HR` | Create/view own requests, eligibility, push |
| **Finance** | `ACCOUNTANT` | Review invoices, forward/reject |
| **Managers** | `SCHOOL_ADMIN`, `SCHOOL_MANAGER`, `MANAGER`, `DOS` | Final approval, reports |
| **Deal admin** | `SUPER_ADMIN` | CRUD deal products |
| **Partner** | `SHULE_AVANCE_PARTNER` | Partner dashboard |

### Lite staff routing

Roles in `LITE_SHULE_AVANCE_ONLY` redirect to `/lite/shule-avance` on login instead of full department portals (HOD, librarian, gate officer, etc.).

---

## Pro vs Lite approval routing

| School type | Cashout / service flow |
|-------------|------------------------|
| **Pro** | Applicant → **Accountant** (if over auto-approval) → **Manager** |
| **Lite** | Applicant → **Manager** directly |

Determined by `computeProAccessEffective` on the school subscription.

---

## Eligibility engine

`buildStaffAdvanceEligibility(schoolId, userId)` computes:

| Output | Meaning |
|--------|---------|
| `allowed` | Whether user can request |
| `net_salary_rwf` | From payroll (`/staff/payroll/my` data) |
| `max_percent` | From `schools.shule_avance_max_percent` (default 25%) |
| `monthly_cap_rwf` | `net_salary × max_percent` |
| `monthly_requested_rwf` | Sum of approved/pending this month |
| `monthly_remaining_rwf` | Cap minus used |
| `auto_approval_limit_rwf` | Portion eligible for instant cashout approval |
| `auto_approval_remaining_rwf` | Remaining auto-approval headroom |

**Auto-approval rule (cashout):** If amount ≤ `auto_approval_remaining_rwf` and within monthly cap, status → `approved` immediately.

School policy API: `GET/PATCH /api/school/shule-avance-policy`

---

## Status lifecycle

| Status | Meaning |
|--------|---------|
| `pending_accountant` | Awaiting finance review (Pro) |
| `sent_to_manager` | Forwarded to school manager |
| `approved` | Approved; payroll deductions apply |
| `rejected_by_accountant` | Rejected by finance |
| `rejected_by_manager` | Rejected by manager |

Frontend maps these in `STATUS_MAP` inside `ShuleAvance.jsx` / `LiteTichaAvancePage.jsx`.

---

## Integrations overview

| System | Role |
|--------|------|
| **Payroll** | Net salary baseline for caps |
| **MTN MoMo** | Direct TichaDeals payment |
| **Babyeyi Pay** | Partner financing intents |
| **Web Push** | Status change notifications |
| **USSD** | Teacher cashout without web |
| **SMTP** | Financing applicant emails |

Details: [05-integrations](./05-integrations.md)
