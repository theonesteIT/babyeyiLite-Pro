# XentriPay Integration (Real-time MoMo)

This project now supports real-time mobile money collection through XentriPay in the public payment flow.

## 1) Environment Variables (backend `.env`)

Add:

```env
XENTRIPAY_API_BASE=https://xentripay.com
XENTRIPAY_BEARER_TOKEN=replace_with_real_token
XENTRIPAY_WEBHOOK_TOKEN=replace_with_random_secret
```

If `XENTRIPAY_BEARER_TOKEN` is missing, payment intent still saves, but live gateway initiation is skipped.

## 2) Supported Flow

- Full payment + Mobile Money triggers `POST /api/collections/initiate`.
- Loan flow remains internal and does not call gateway.
- Every intent stores provider metadata in `babyeyi_payment_intents`:
  - `provider`
  - `provider_status`
  - `provider_reference`
  - `provider_tid`
  - `provider_authkey`
  - `provider_payload_json`
  - `last_provider_check_at`

## 3) API Endpoints

- `POST /api/public/babyeyi-pay/intent`
  - Initiates XentriPay for full MoMo payment when configured.
  - Returns intent id + provider refs and status.

- `POST /api/public/babyeyi-pay/intent/:id/check-provider-status`
  - Refreshes provider status from XentriPay and updates local intent status.
  - Maps provider status to local status:
    - `COMPLETED`/`SUCCESS` -> `paid`
    - `FAILED`/`REJECTED`/`CANCELLED` -> `failed`
    - otherwise -> `submitted`

- `POST /api/public/babyeyi-pay/webhook/xentripay`
  - Receives XentriPay webhook updates.
  - Protect with `XENTRIPAY_WEBHOOK_TOKEN`.
  - Accepted auth:
    - query `?token=...`
    - header `x-xentripay-webhook-token: ...`

## 4) Frontend Behavior

In `frontend/src/Pages/Public Page/payments.jsx`:

- On submit, if gateway is enabled and method is MoMo:
  - shows provider reference/TID and current status
  - auto-checks status once after 5 seconds
  - provides manual "Refresh payment status" button

## 5) Important Validation Rules

Based on XentriPay API document:

- Currency forced to `RWF`.
- Amount is sent as whole number.
- Rwanda phone is normalized to:
  - local `07XXXXXXXX` for `cnumber`
  - `2507XXXXXXXX` for `msisdn`

## 6) Recommended Production Hardening

- Ask XentriPay for webhook callback support and add a signed webhook endpoint.
- Move from polling-only to webhook-first reconciliation.
- Add retry strategy and dead-letter alerting for failed gateway calls.
- Add back-office reconciliation report by `provider_reference` and `provider_tid`.
