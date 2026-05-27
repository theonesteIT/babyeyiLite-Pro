# Combined Tuition + Requirements — Public Pay (USSD Implementation Guide)

This document explains how the **web** flow works at `/combined-tution-requrement` and how to rebuild the same flow on **USSD** (or any telco menu) using the existing Babyeyi HTTP APIs.

**Audience:** Backend/USSD integrators, mobile money aggregators, internal dev teams.

**Related files:**

| Resource | Path |
|----------|------|
| API reference | `docs/API_REFERENCE.md` |
| Postman (E2E tests) | `docs/postman/BabyeyiSystem.postman_collection.json` → folder **10c** → **E2E — Combined tuition** |
| Web UI | `frontend/src/Pages/Public Page/CombinedTutionRequrement.jsx` → `PaidAtSchool.jsx` → `/payments` |
| Backend pay | `backend/BabyeyiRoutes/publicPaySchoolFlow.js`, `publicBabyeyiPay.js`, `schoolResolvePublic.js` |

---

## 1. What “combined tuition” means

Parents pay **in one checkout**:

1. **Tuition** and other Babyeyi fee lines (online pay channel).
2. **Paid at school** lines (counter items still on the Babyeyi document).
3. **Requirements** (books, uniforms, etc. on the same approved Babyeyi for that class/term).

The web route `/combined-tution-requrement` enables requirements (`includeRequirements={true}`). The APIs below are the same; only which fee/requirement IDs you send in `selected_fee_ids` / `selected_requirement_ids` changes.

---

## 2. Architecture (USSD ↔ Babyeyi)

```text
  Parent phone (*XXX#)
        │
        ▼
  USSD Gateway (telco / aggregator)
        │  HTTP JSON per menu step
        ▼
  Your USSD App Server (session store: MSISDN → state + cached API data)
        │
        ▼
  Babyeyi API  (baseUrl + /api/...)
        │  No login cookie for public pay
        ▼
  MySQL + MoMo / XentriPay (triggered by intent API)
```

**Your USSD server must:**

- Keep **session state** between USSD screens (student code, `school_code`, `babyeyi_id`, selected lines, amount).
- Call Babyeyi with `Content-Type: application/json`.
- Use **`school_code`** (directory code, e.g. `003`) in pay APIs — not the numeric `schools.id`, unless you prefer `school_id`.
- Map the payer MoMo number to `payment_plan.momo.phone` (usually the calling `MSISDN`).

---

## 3. API sequence (exact order)

| Step | USSD screen (example) | HTTP call | Required inputs |
|------|------------------------|-----------|-----------------|
| 0 | Main menu: “Pay school fees” | — | — |
| 1 | “Enter student code” | `POST /api/public/public-pay/student-catalog` | `code` |
| 2 | “Select academic year” | *(none — use step 1 data)* | Pick from `combinations` |
| 3 | “Select term” | *(none)* | Filter `combinations` by year |
| 4 | “Confirm fees” (summary) | `GET /api/public/babyeyi-pay/pricing/:babyeyiId` | `school_code`, `babyeyi_id` |
| 5 | “Enter amount” / confirm total | `POST /api/public/babyeyi-pay/quote-balance` | school, babyeyi, selections, student |
| 6 | “Confirm pay with MoMo” | `POST /api/public/babyeyi-pay/intent` | amount, payer phone, selections |
| 7 | “Check payment…” | `POST /api/public/babyeyi-pay/intent/:id/check-provider-status` | `intent` id from step 6 |

**There is no separate API for “select year” or “select term”.** Those choices only pick one row from `data.combinations[]` returned in step 1.

---

## 4. API details (copy-paste for integrators)

**Base URL:** `https://your-api-host` (local: `http://localhost:5100`)

### 4.1 Discovery (optional)

```http
GET /api/public/public-pay
GET /api/public/babyeyi-pay/
```

Returns JSON describing steps (`student_catalog`, `class_pricing`, `intent`, etc.).

---

### 4.2 Step 1 — Student code → school + term/year options

```http
POST /api/public/public-pay/student-catalog
Content-Type: application/json

{
  "code": "010010001"
}
```

**Accepted `code` values:** `student_uid`, official `student_code`, or `sdm_code` (SDMS ID).

**Success `200` — store in USSD session:**

```json
{
  "success": true,
  "data": {
    "school": {
      "id": 14,
      "school_name": "GS Example",
      "school_code": "003"
    },
    "student": {
      "id": 99,
      "student_uid": "010010001",
      "student_code": "01/001/0001",
      "first_name": "Jean",
      "last_name": "Doe",
      "class_name": "P1",
      "academic_year": "2025-2026"
    },
    "academic_years": ["2025-2026", "2024-2025"],
    "terms": ["1", "2", "3"],
    "default_academic_year": "2025-2026",
    "default_term": "1",
    "combinations": [
      {
        "babyeyi_id": 5,
        "class_name": "P1",
        "term": "1",
        "academic_year": "2025-2026"
      }
    ]
  }
}
```

**USSD logic:**

1. If `combinations.length === 0` → show error, end session.
2. Build **unique** `academic_years` from `combinations` (or use `data.academic_years`).
3. After user picks year `Y`, filter `combinations` where `academic_year === Y`.
4. Build **unique** `terms` from filtered list; user picks term `T`.
5. Find **one** row: `combo = combinations.find(c => c.academic_year === Y && c.term === T)`.
6. Save: `school_code = data.school.school_code`, `babyeyi_id = combo.babyeyi_id`, `student` object.

**Errors:**

| HTTP | Meaning |
|------|---------|
| 404 | Student not found |
| 422 | Student has no class on file |
| 404 (in body) | No Babyeyi published for that class |

---

### 4.3 Step 2 — Load fees (tuition + paid-at-school + requirements)

```http
GET /api/public/babyeyi-pay/pricing/{babyeyi_id}?school_code={school_code}
```

Example:

```http
GET /api/public/babyeyi-pay/pricing/5?school_code=003
```

Alternative (web app today): `?school_id=14`

**Success — key fields:**

```json
{
  "success": true,
  "data": {
    "babyeyi": { "id": 5, "class_name": "P1", "term": "1", "academic_year": "2025-2026" },
    "school_fees": [
      { "id": 1, "name": "Tuition", "amount": 120000, "pay_source": "babyeyi" },
      { "id": "pasreq:12", "name": "Activity paid at school", "amount": 5000, "pay_source": "requirement_paid_at_school" }
    ],
    "requirements": [
      { "babyeyi_requirement_id": 3, "item": "English book", "line_total_rwf": 15000 }
    ],
    "school_fees_total_rwf": 125000,
    "requirements_total_rwf": 15000,
    "combined_total_rwf": 140000
  }
}
```

**USSD simplification (recommended for v1):**

| Menu option | What to send in pay APIs |
|-------------|---------------------------|
| Pay everything | All `school_fees[].id` + all `requirements[].babyeyi_requirement_id` |
| Pay tuition only | Fee lines where `pay_source` is not only requirements |
| Pay requirements only | `selected_requirement_ids` only, amount = requirements total |

For **combined** flow (same as web), select **all** fee IDs and **all** requirement IDs unless product asks otherwise.

Build arrays:

```javascript
selected_fee_ids = data.school_fees.map(f => f.id);
selected_requirement_ids = data.requirements.map(r => r.babyeyi_requirement_id);
```

---

### 4.4 Step 3 — Remaining balance (before charging)

```http
POST /api/public/babyeyi-pay/quote-balance
Content-Type: application/json

{
  "school_code": "003",
  "babyeyi_id": 5,
  "selected_fee_ids": [1, "pasreq:12"],
  "selected_requirement_ids": [3],
  "selected_students": [
    {
      "student_id": 99,
      "student_uid": "010010001",
      "student_code": "01/001/0001",
      "student_name": "Jean Doe",
      "class_name": "P1",
      "academic_year": "2025-2026",
      "school_name": "GS Example"
    }
  ],
  "school_counter_credits_rwf": {}
}
```

**Response (example):**

```json
{
  "success": true,
  "data": {
    "remaining_rwf": 140000,
    "remaining_full_document_rwf": 140000
  }
}
```

Show `remaining_rwf` on USSD as “Amount due”. For v1 USSD, often **fixed pay full balance** = `remaining_rwf` (no partial amount).

---

### 4.5 Step 4 — Create payment + MoMo USSD push

```http
POST /api/public/babyeyi-pay/intent
Content-Type: application/json

{
  "school_code": "003",
  "babyeyi_id": 5,
  "academic_year": "2025-2026",
  "term": "1",
  "class_name": "P1",
  "total_rwf": 140000,
  "status": "submitted",
  "selected_fee_ids": [1, "pasreq:12"],
  "selected_requirement_ids": [3],
  "school_counter_credits_rwf": {},
  "selected_student": {
    "student_id": 99,
    "student_uid": "010010001",
    "student_code": "01/001/0001",
    "student_name": "Jean Doe",
    "class_name": "P1",
    "academic_year": "2025-2026",
    "school_name": "GS Example"
  },
  "selected_students": [
    { "student_id": 99, "student_uid": "010010001", "student_name": "Jean Doe" }
  ],
  "payer": {
    "name": "Parent",
    "phone": "0781234567",
    "email": null
  },
  "public_pay_no_login": true,
  "from_public_finder": true,
  "payment_plan": {
    "method": "momo",
    "payMode": "full",
    "momo": {
      "provider": "mtn",
      "phone": "0781234567"
    }
  }
}
```

**Notes:**

- `school_id` (numeric) still works; **`school_code` is preferred** for USSD.
- `total_rwf` must match business rules (usually full selected total or `remaining_rwf`).
- `payer.phone` / `payment_plan.momo.phone`: Rwanda format `07xxxxxxxx` (server may normalize).

**Success — save `data.id` as `payment_intent_id` and `invoice_no` for receipts.**

MoMo: customer receives **MTN USSD PIN prompt** on that phone.

---

### 4.6 Step 5 — Poll payment status

```http
POST /api/public/babyeyi-pay/intent/{payment_intent_id}/check-provider-status
```

Call every 3–5 seconds for up to ~60–90 seconds.

**USSD messages:**

- Pending → “Approve on your phone (MoMo PIN)…”
- Success → “Payment received. Invoice: INV-…”
- Failed → “Payment failed. Try again.”

Optional receipt verify:

```http
GET /api/public/babyeyi-pay/invoices/verify/{id}?invoice_no={invoice_no}
```

---

## 5. USSD session model (recommended)

Store per `session_id` (telco session + MSISDN):

| Key | When set |
|-----|----------|
| `step` | Current menu enum |
| `student_code_input` | Step 1 |
| `school_code` | After catalog |
| `babyeyi_id` | After year+term pick |
| `student` | From catalog |
| `combinations` | From catalog |
| `pricing` | After GET pricing |
| `selected_fee_ids` | After fee menu |
| `selected_requirement_ids` | After fee menu |
| `amount_rwf` | From quote-balance or pricing |
| `payment_intent_id` | After intent |

**State machine (minimal):**

```text
START → ENTER_STUDENT_CODE → PICK_YEAR → PICK_TERM → SHOW_SUMMARY
  → CONFIRM_AMOUNT → CONFIRM_MOMO → POLL_STATUS → END
```

If only one year or one term exists, **skip** that menu (same as web defaults).

---

## 6. Example USSD menus (English)

Keep each screen under ~160 characters where possible.

**Screen A — Student code**

```text
Pay School Fees (Babyeyi)
Enter student code/UID:
(e.g. 010010001)
```

**Screen B — Academic year** (if multiple)

```text
Select Academic Year:
1. 2025-2026
2. 2024-2025
0. Back
```

**Screen C — Term**

```text
Select Term:
1. Term 1
2. Term 2
3. Term 3
0. Back
```

**Screen D — Summary**

```text
Jean Doe - P1
GS Example
Tuition+Req: 140,000 RWF
1. Pay full amount
0. Cancel
```

**Screen E — MoMo**

```text
Pay 140,000 RWF
MoMo: 078****567
1. Confirm
0. Cancel
```

**Screen F — Wait**

```text
Approve MTN MoMo on your phone.
Enter PIN when prompted.
(Checking...)
```

---

## 7. Differences: Web vs USSD

| Topic | Web (`PaidAtSchool`) | USSD |
|--------|----------------------|------|
| Year/term | Dropdowns | Numbered menu from `combinations` |
| Fee selection | Checkboxes | Usually “pay all” for v1 |
| School key | Uses `school.id` in URL | Use `school_code` in query/body |
| Partial pay | Supported | Optional; start with **full balance** |
| Session | Browser + `sessionStorage` | Your Redis/DB session |
| Auth | None (public) | None (public) |
| MoMo | Same intent API | Same intent API |

---

## 8. Error handling (show on USSD)

| API message (examples) | User-facing text |
|------------------------|------------------|
| No student found for that code | Student not found. Check code. |
| No published Babyeyi for class | No fees published for this class. Contact school. |
| school_id or school_code is required | System error. Retry. |
| Invalid payload | Payment could not start. Retry. |
| Balance / amount errors from intent | Amount invalid. Pay full fees. |
| MoMo timeout | Payment not confirmed. Check MoMo or retry. |

Always log: `session_id`, `MSISDN`, `student code`, `school_code`, `babyeyi_id`, HTTP status, `success`, `message`.

---

## 9. Testing without USSD hardware

1. Import Postman collection → **10c** → **E2E — Combined tuition**.
2. Set `studentLookupCode`, run steps 1 → 2 → 3 → 6.
3. Use real student code and `schoolCode` from your DB.

Or curl:

```bash
# 1 Catalog
curl -s -X POST http://localhost:5100/api/public/public-pay/student-catalog \
  -H "Content-Type: application/json" \
  -d '{"code":"STUDENT_UID_HERE"}'

# 2 Pricing (replace IDs from step 1)
curl -s "http://localhost:5100/api/public/babyeyi-pay/pricing/5?school_code=003"

# 3 Quote balance
curl -s -X POST http://localhost:5100/api/public/babyeyi-pay/quote-balance \
  -H "Content-Type: application/json" \
  -d '{"school_code":"003","babyeyi_id":5,"selected_fee_ids":[],"selected_requirement_ids":[],"selected_students":[]}'

# 4 Intent
curl -s -X POST http://localhost:5100/api/public/babyeyi-pay/intent \
  -H "Content-Type: application/json" \
  -d @intent-body.json
```

---

## 10. Security and limits

- Public routes use **rate limiting** (~120 requests / 15 min per IP on public-pay flow).
- Do not expose Super Admin routes on USSD.
- Validate student code length/format before calling API.
- Use HTTPS in production.
- MoMo secrets stay on Babyeyi server (`.env`), not on USSD menu text.

---

## 11. Checklist for “done” USSD integration

- [ ] `student-catalog` resolves student and returns `combinations`
- [ ] Year + term menus map to one `babyeyi_id`
- [ ] `pricing` shows tuition + requirements + `combined_total_rwf`
- [ ] `quote-balance` returns `remaining_rwf`
- [ ] `intent` with `school_code`, MoMo phone, full selections
- [ ] Poll `check-provider-status` until terminal state
- [ ] Session cleared on success/cancel/timeout
- [ ] Error messages user-friendly in Kinyarwanda/English as needed

---

## 12. Optional APIs (not required for core combined pay)

| API | Use case |
|-----|----------|
| `POST /api/public/student-code-lookup` | Quick name lookup only (no fees) |
| `POST /api/public/public-pay/school-catalog` | Pay by school code without student first |
| `GET /api/public/babyeyi-pay/receipt/:id.pdf` | Receipt link (SMS link after pay) |

---

## 13. Contact points in codebase

| Question | Where to look |
|----------|----------------|
| Student catalog SQL / class filter | `publicPaySchoolFlow.js` → `POST /student-catalog` |
| Pricing lines | `babyeyiPublicPricingCore.js` |
| Balance math | `babyeyiPayBalanceCore.js` |
| Intent + MoMo | `publicBabyeyiPay.js` → `POST /intent` |
| School code resolution | `schoolResolvePublic.js` |

---

*Document version: 2026-05-25 — aligned with public pay APIs and `school_code` support on pricing, quote-balance, and intent.*
