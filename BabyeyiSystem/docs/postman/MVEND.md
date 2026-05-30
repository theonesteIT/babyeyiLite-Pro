# MVEND API — Postman guide

Postman collection and helpers for the MVEND wallet/transfer API.

## Files

| File | Purpose |
|------|---------|
| `MVEND.postman_collection.json` | API requests (Token, Session key, wallet, transfers) |
| `MVEND.postman_environment.json` | Environment variables template |
| `generate-mvend-credentials.mjs` | Generates `X-PIN`, `X-NOUNCE`, and `session_key` |
| `package.json` | Dependencies for the generator script |

## Import into Postman

1. Open Postman → **Import**
2. Select `MVEND.postman_collection.json` and `MVEND.postman_environment.json`
3. Choose the **MVEND** environment in the top-right dropdown

## Generate encrypted credentials

Wallet and transfer requests need `X-PIN`, `X-NOUNCE`, and a registered `session_key`. All three must come from the **same generator run** (they share one symmetric key).

```powershell
cd BabyeyiSystem\docs\postman
npm install
node generate-mvend-credentials.mjs 24272
```

Replace `24272` with your wallet PIN.

Copy the output into the environment:

| Script output | Environment variable |
|---------------|----------------------|
| `pin.X-PIN` | `x-pin` |
| `pin.X-NOUNCE` | `x-nounce` |
| `base64_key.session_key` | `session_key` |

## Configure environment

Set these before calling the API:

| Variable | Description |
|----------|-------------|
| `api-url` | MVEND base URL |
| `grant_type` | Usually `client_credentials` |
| `client_id` | OAuth client ID from MVEND |
| `client_secret` | OAuth client secret |
| `session_id` | Session identifier (from MVEND) |
| `expires_at` | Session expiry (ISO timestamp) |
| `x-sessionid` | Sent as `X-SessionID` header on wallet requests |
| `country` | e.g. `RW` |
| `currency` | e.g. `RWF` |
| `phone` | Wallet phone number |
| `wallet_id` | Target wallet ID |

## Request order

Run requests in this order:

### 1. Token

`POST {{api-url}}/auth/oauth2/token`

The collection **Tests** script saves the JWT automatically:

- Reads `access_token` or `token` from the response
- Sets `jwt-token` in the active environment

### 2. Session key

`POST {{api-url}}/auth/oauth2/sessionkey`

Uses Bearer auth (`jwt-token`) and registers the RSA-encrypted symmetric key:

```json
{
  "session_id": "{{session_id}}",
  "session_key": "{{session_key}}",
  "expires_at": "{{expires_at}}"
}
```

### 3. Wallet / transfer requests

These require Bearer auth plus headers:

- `X-Country` → `{{country}}`
- `X-Currency` → `{{currency}}`
- `X-Phonenumber` → `{{phone}}`
- `X-PIN` → `{{x-pin}}`
- `X-Nounce` → `{{x-nounce}}`
- `X-SessionID` → `{{x-sessionid}}`

Available requests in the collection include **Balance**, **Transaction**, **Topup**, **Transfer**, and **Transfer status**.

## Troubleshooting

- **401 on Token** — Check `client_id`, `client_secret`, and `api-url`.
- **Session key rejected** — Regenerate credentials and use a fresh `session_key` from the same run as `x-pin` / `x-nounce`.
- **Wallet request fails** — Confirm Token and Session key both succeeded; verify `x-sessionid` matches your MVEND session.
- **PIN errors** — Re-run the generator if you changed the PIN or started a new session.

Postman’s built-in crypto does not support XChaCha20-Poly1305, so always run `generate-mvend-credentials.mjs` outside Postman and paste the values into the environment.
