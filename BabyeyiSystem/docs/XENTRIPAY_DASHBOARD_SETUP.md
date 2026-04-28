# XentriPay Dashboard Setup (Collections + Webhook)

Use these exact steps in your XentriPay dashboard to connect with Babyeyi backend.

## 1) API key setup

Open:

- `Developers` -> `API Keys & Webhooks`

Copy your bearer token and save in `backend/.env`:

```env
XENTRIPAY_API_BASE=https://xentripay.com
XENTRIPAY_BEARER_TOKEN=YOUR_BEARER_TOKEN
```

## 2) Webhook endpoint setup

In `backend/.env`, also set:

```env
XENTRIPAY_WEBHOOK_TOKEN=YOUR_STRONG_RANDOM_SECRET
```

Configured backend webhook endpoint:

- `POST /api/public/babyeyi-pay/webhook/xentripay`

Production URL example:

- `https://your-domain.com/api/public/babyeyi-pay/webhook/xentripay?token=YOUR_STRONG_RANDOM_SECRET`

In XentriPay webhook page:

- `URL`: paste URL above
- Events to select (minimum):
  - `COLLECTION_SUCCESSFUL`
  - `COLLECTION_FAILED`
  - any collection pending/processing event available

Then click `Update Webhooks`.

## 3) Collections in dashboard

Open:

- `Collections` -> `Collection Requests`

You can monitor transactions initiated from Babyeyi payment page:

- status progress: pending -> successful/failed
- reference fields should match your backend `provider_reference` or `provider_tid`

## 4) Local testing note

If backend runs on localhost, XentriPay cannot call it directly.

Use a tunnel:

- `ngrok http 5100`

Then set webhook URL to your ngrok HTTPS URL:

- `https://<your-ngrok>.ngrok-free.app/api/public/babyeyi-pay/webhook/xentripay?token=...`

## 5) Verification checklist

1. Submit MoMo full payment from frontend.
2. Confirm `babyeyi_payment_intents.provider = xentripay`.
3. Confirm `provider_reference` or `provider_tid` is saved.
4. Trigger payment success in gateway.
5. Verify webhook updates:
   - `provider_status` (gateway status)
   - `status = paid` when successful
6. If webhook delayed, use fallback endpoint:
   - `POST /api/public/babyeyi-pay/intent/:id/check-provider-status`
