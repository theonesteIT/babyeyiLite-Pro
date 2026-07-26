# TichaAvance — API Reference

Base mount: **`/api/services`** (routes defined in `shuleAvanceServices.js`).

**Default auth:** Session cookie + `requireLoggedIn` or `requireRole(...)`.

---

## Catalog & products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/shule-avance/catalog` | Session | Active service + cashout categories |
| GET | `/shule-avance/teacher-deal-products` | Session | TichaDeals product list |

### Super Admin — deal products

| Method | Path | Role |
|--------|------|------|
| GET | `/shule-avance/admin/teacher-deal-products` | SUPER_ADMIN |
| POST | `/shule-avance/admin/teacher-deal-products` | SUPER_ADMIN |
| PUT | `/shule-avance/admin/teacher-deal-products/:id` | SUPER_ADMIN |
| DELETE | `/shule-avance/admin/teacher-deal-products/:id` | SUPER_ADMIN |

### Super Admin — service catalog (auth mount)

| Method | Path |
|--------|------|
| GET/POST/PATCH/DELETE | `/api/auth/shule-avance-teacher-catalog` |

---

## Applicant (staff / teacher)

Role guard: `APPLICANT_ROLES` (TEACHER, HOD, DOS, ACCOUNTANT, librarian, gate, secretary, HR, etc.)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shule-avance/applicant/eligibility` | Eligibility + caps |
| GET | `/shule-avance/applicant/my-requests` | Own request history |
| POST | `/shule-avance/applicant/requests` | Create request |
| PUT | `/shule-avance/applicant/requests/:id` | Update pending request |
| DELETE | `/shule-avance/applicant/requests/:id` | Cancel request |

### Legacy aliases (same handlers)

| Method | Path |
|--------|------|
| GET | `/shule-avance/teacher/my-requests` |
| POST | `/shule-avance/teacher/requests` |
| PUT | `/shule-avance/teacher/requests/:id` |
| DELETE | `/shule-avance/teacher/requests/:id` |

### Create request body (reference)

```json
{
  "request_type": "cashout",
  "amount_rwf": 120000,
  "repayment_term_months": 3,
  "reason": "Emergency",
  "cashout_category_slug": "general",
  "service_category": "cash_power",
  "service_payload": {},
  "metadata": {
    "payment_method": "ticha_avance"
  },
  "deal_lines": []
}
```

For TichaDeals, include `deal_lines` with product snapshots and `service_category: "teacher_deals"`.

---

## Web push

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shule-avance/applicant/push/vapid-key` | Public VAPID key |
| POST | `/shule-avance/applicant/push/subscribe` | Save subscription |
| POST | `/shule-avance/applicant/push/unsubscribe` | Remove subscription |

---

## Deal payment token (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/shule-avance/applicant/teacher-deal-pay-token` | Generate MoMo pay token for deal |

---

## Finance (accountant)

Role: `ACCOUNTANT`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shule-avance/finance/requests` | All school requests |
| GET | `/shule-avance/finance/pending-invoices` | Pending invoice queue |
| PATCH | `/shule-avance/finance/invoice-requests/:id/send-to-manager` | Forward to manager |
| PATCH | `/shule-avance/finance/invoice-requests/:id/reject` | Reject with note |

---

## Manager

Roles: `SCHOOL_ADMIN`, `SCHOOL_MANAGER`, `MANAGER`, `DOS`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shule-avance/manager/requests` | School requests |
| GET | `/shule-avance/manager/reports/summary` | Summary report |
| GET | `/shule-avance/manager/pending-requests` | Pending queue |
| PATCH | `/shule-avance/manager/invoice-requests/:id/decision` | Approve/reject |

Decision body:

```json
{
  "decision": "approve",
  "manager_note": "Optional note"
}
```

---

## Public deal payment (no session)

Token-based; used by `TichaDealPayments` pages.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shule-avance/public/teacher-deal-pay-payload` | Load pay session by token |
| POST | `/shule-avance/public/teacher-deal-pay-momo` | Initiate MoMo collection |
| POST | `/shule-avance/public/teacher-deal-pay-momo-status` | Poll payment status |
| POST | `/shule-avance/public/teacher-deal-pay-alt-intent` | Alternate payment intent |

Query param `token` typically required on GET payload.

---

## Portal payment requests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shule-avance/portal/teacher-deal-payment-requests` | Deal payment request list (portal guard) |

---

## School policy

| Method | Path | Role |
|--------|------|------|
| GET | `/api/school/shule-avance-policy` | Manager |
| PATCH | `/api/school/shule-avance-policy` | Manager |

---

## Partner organizations

### Super Admin

| Method | Path |
|--------|------|
| GET/POST/PUT/DELETE | `/api/auth/shule-avance-organization(s)` |

### Partner portal (`/api/shule-avance-partner`)

| Method | Path |
|--------|------|
| GET | `/me`, `/requests`, `/requests/:id`, `/stats` |
| PATCH | `/requests/:id` |

### Public financing picker

| Method | Path |
|--------|------|
| GET | `/api/public/babyeyi-pay/shule-avance-organizations` |

---

## USSD (teacher-portal mount)

Documented in [../teacher-avance-ussd-api.md](../teacher-avance-ussd-api.md).

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/teacher-portal/avance/ussd/login` | Public |
| POST | `/api/teacher-portal/avance/ussd/cashout-request` | Bearer |
| GET | `/api/teacher-portal/avance/ussd/requests` | Bearer |

---

## Legacy endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/shule-avance/status` | Legacy status check |
| POST | `/shule-avance/apply` | Legacy apply |
| DELETE | `/shule-avance/cancel/:id` | Legacy cancel → delegates to delete |

Prefer `applicant/*` routes for new integrations.

---

## Payroll (related)

| Method | Path | Used for |
|--------|------|----------|
| GET | `/api/staff/payroll/my` | Net salary on eligibility UI |
| GET | `/api/teacher-portal/staff/payroll/my` | Teacher portal alias |

---

## Response shape

```json
{
  "success": true,
  "data": { },
  "message": "Human-readable message"
}
```

Eligibility `data` includes: `allowed`, `net_salary_rwf`, `max_percent`, `monthly_cap_rwf`, `monthly_requested_rwf`, `monthly_remaining_rwf`, `auto_approval_limit_rwf`, `auto_approval_remaining_rwf`, `message`.

---

## Environment variables (backend)

| Variable | Purpose |
|----------|---------|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push |
| `MTN_MOMO_*` | MoMo collection for deals |
| `SMTP_*` | Financing emails (optional) |
| `TEACHER_USSD_SESSION_TTL_MINUTES` | USSD token TTL (default 30) |

See [05-integrations](./05-integrations.md) for MoMo variable names.
