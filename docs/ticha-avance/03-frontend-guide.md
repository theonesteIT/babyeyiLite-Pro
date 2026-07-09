# TichaAvance — Frontend Guide

How the TichaAvance UI is structured and how to rebuild or extend it.

---

## Component map

| Component | Location | Used in |
|-----------|----------|---------|
| `ShuleAvance.jsx` | `teacher-portal/src/pages/` | Standalone teacher portal `/shule-avance` |
| `LiteTichaAvancePage.jsx` | `BabyeyiSystem/frontend/.../lite/` | Lite staff `/lite/shule-avance` |
| `SchoolLiteShuleAvance.jsx` | Shell + routing for Lite | Bottom nav: Ticha Avance / TichaDeals |
| `LiteShuleAvanceSidebar.jsx` | Lite sidebar | Nav labels |
| `ShuleAvanceRepaymentCalculator.jsx` | Shared component | Repayment preview in wizards |
| `TichaDeals.jsx` | teacher-portal | Product grid |
| `TichaDealDetails.jsx` | teacher-portal + `staffTichaDeals` | Checkout modal |
| `TrackingTichaDeals.jsx` | teacher-portal | Order tracking |
| `TichaDealPayments.jsx` | teacher-portal | MoMo payment page |

`LiteTichaAvancePage.jsx` and `ShuleAvance.jsx` are **near-duplicates** (~1,400 lines). When fixing bugs, patch both or extract shared hooks.

---

## Page structure (`ShuleAvance.jsx`)

### State layers

| State | Purpose |
|-------|---------|
| `eligibility` | From `/applicant/eligibility` |
| `requests` | From `/applicant/my-requests` |
| `catalog` | Service + cashout tiles |
| `payroll` | From `/staff/payroll/my` |
| Modal wizards | Cashout, service, invoice flows |
| `pushEnabled` | Web push subscription status |
| Status alerts | Transition toasts from polling |

### Key constants

```javascript
const REPAYMENT_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);
const INVOICE_STEPS = [
  { id: 1, label: 'Document', icon: Upload },
  { id: 2, label: 'Breakdown', icon: Plus },
  { id: 3, label: 'Terms', icon: Clock },
];
const DIRECT_STEPS = [
  { id: 1, label: 'Details', icon: Wallet },
  { id: 2, label: 'Repayment', icon: Clock },
];
```

### Status badges

`STATUS_MAP` maps backend `status` strings to label + Tailwind classes:

- `pending_accountant` → amber
- `sent_to_manager` → sky
- `approved` → emerald
- `rejected_by_*` → red

---

## Data loading pattern

```javascript
const loadAll = useCallback(async () => {
  const [eligRes, reqRes, catRes, payrollRes] = await Promise.all([
    api.get('/services/shule-avance/applicant/eligibility'),
    api.get('/services/shule-avance/applicant/my-requests'),
    api.get('/services/shule-avance/catalog'),
    api.get('/staff/payroll/my'),
  ]);
  // setState from res.data.data
}, []);
```

Poll or refresh after create/update/delete. Compare request statuses with `sessionStorage` snapshot for transition alerts.

---

## Wizard flows

### Cashout modal

1. Open from “Request cashout” CTA
2. Select category (from catalog cashout items)
3. Enter amount, reason, repayment term
4. `POST /applicant/requests`
5. Show success or validation error
6. Refresh list + eligibility

### Service modal

1. Click service tile (icon from `pickServiceIcon(slug)`)
2. Step 1: service-specific fields in `service_payload`
3. Step 2: repayment term + `ShuleAvanceRepaymentCalculator`
4. Submit

### Invoice modal

1. Upload document (multipart or presigned — follow existing upload helper)
2. Line items + vendor
3. Terms + submit

---

## Lite shell routing

`SchoolLiteShuleAvance.jsx`:

| Route | Page |
|-------|------|
| `/lite/shule-avance` | `LiteTichaAvancePage` |
| `/lite/shule-avance/deals` | `LiteTichaDealsPage` |
| `/lite/shule-avance/deals/:id` | `LiteTichaDealDetailPage` |
| `/lite/shule-avance/pay` | `LiteTichaDealPaymentsPage` |

Mobile bottom nav toggles between **Ticha Avance** and **TichaDeals**.

---

## Teacher portal routes (deals)

| Route | Component |
|-------|-----------|
| `/shule-avance` | Main advance dashboard |
| `/ticha-deals` | Catalog |
| `/ticha-deals/:id` | Product detail |
| `/ticha-deals/tracking` | Tracking list |
| `/ticha-deals/pay` | MoMo checkout |

Sidebar label: “Shule Avance” (path `/shule-avance`).

---

## Shared utilities

| File | Purpose |
|------|---------|
| `webPushTeacherPortal.js` | VAPID subscribe/unsubscribe |
| `ShuleAvanceRepaymentCalculator.jsx` | Monthly deduction estimate |
| `toAssetUrl()` | Resolve deal product images via `VITE_UPLOADS_BASE` |

---

## Styling conventions

- **Lite pages:** Babyeyi dashboard theme (`BABYEYI_FONT_STACK`, `text-re-orange` accents)
- **Teacher portal:** Navy/gold sidebar context; Avance page uses white cards on gray background
- **Modals:** `createPortal` to `document.body` for overlay
- **Money:** `formatMoney(n)` → `"120,000 RWF"`

---

## Adding a new service category

1. **Super Admin:** Add row to `shule_avance_teacher_catalog` via `/api/auth/shule-avance-teacher-catalog`
2. **Backend:** Ensure slug is accepted in `handleApplicantCreate` validation
3. **Frontend:** Optional custom fields in service modal based on `service_category`
4. **Icon:** Extend `pickServiceIcon()` if needed

---

## Adding UI to a new portal

Minimum integration:

1. Copy or import `ShuleAvance.jsx` patterns
2. Ensure `api` uses `withCredentials: true`
3. Register route under authenticated layout
4. Add nav link
5. Register service worker if using push (`/sw.js`)

For deals only, import from `shared/staffTichaDeals/createStaffTichaDeals.jsx` (used in DOS, discipline, accountant lite portals).

---

## Testing checklist

| Test | Expected |
|------|----------|
| Eligibility loads | Shows net salary and cap |
| Cashout under auto-limit | Immediate `approved` |
| Cashout over limit | `pending_accountant` or manager queue |
| Edit pending request | PUT succeeds |
| Delete pending | Removed from list |
| Push subscribe | Browser permission + POST subscribe |
| Status change | In-app alert after poll |
| Lite bottom nav | Switches Avance ↔ Deals |
| Deal image | `VITE_UPLOADS_BASE` resolves URL |

---

## Known implementation notes

- Deal requests send `metadata.payment_method: 'ticha_avance'` for payroll checkout; tracking UI reads `row.metadata` when present.
- `ShuleAvance.jsx` and `LiteTichaAvancePage.jsx` should stay in sync for business logic changes.
- Repayment options are 1–18 months in UI; confirm backend accepts chosen term.
