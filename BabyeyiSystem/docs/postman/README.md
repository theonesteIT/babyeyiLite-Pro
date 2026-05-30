# Babyeyi Postman pack

Ready-to-import Postman setup for the `BabyeyiSystem/backend` API.

## Files

- `BabyeyiSystem.postman_collection.json` — organized collection (Postman v2.1)
- `BabyeyiSystem.local.postman_environment.json` — local environment variables (`baseUrl`, `password`, etc.)
- `MVEND.postman_collection.json` — MVEND wallet/transfer API (see **`MVEND.md`**)
- `MVEND.postman_environment.json` — MVEND environment template
- `generate-mvend-credentials.mjs` — generates MVEND `X-PIN`, `X-NOUNCE`, and `session_key`

If import ever fails, ensure the collection file is **single JSON** (one top-level object). Backup copies from repair merges may appear as `*.broken-backup`, `*.pre-ussd-merge`, etc.

## Import

1. Open Postman → **Import** → select both JSON files in this folder.
2. Select environment **BabyeyiSystem Local** (or your copy).
3. Set variables to match your machine/account:
   - `baseUrl` (e.g. `http://localhost:5100`)
   - `identifier` / `email` (depends on request; collection uses both in places)
   - `password` — default in env is `ChangeMe123!` for quick testing; use a real password for live accounts
   - `schoolCode` when the route expects it

## First run (session cookie)

Most school/admin routes use session cookies (`babyeyi_sid`).

1. Run **`01 - Auth & Session`** → `POST /api/auth/login` (or the login variant that matches the folder instructions).
2. Run `GET /api/session/me` to confirm the session.
3. Call protected endpoints in other folders.

**Parent portal** and some flows use their own login routes (see folder descriptions inside the collection, e.g. parent portal / public pay sections).

## Teacher Avance (USSD)

Folder **`Teacher Avance USSD`**: set **`teacherStaffId`** to the **Staff ID / Code** from Manager **HR Central** (HRCentral — the value stored as `staff.staff_id`), plus **`password`**, **`schoolCode`**. Login stores **`ussdAccessToken`** for the other USSD requests.

## Form-data / uploads

Some requests need **Body → form-data** and real files (imports, logos, etc.). Add fields manually in Postman when the request has no sample body.

## Combined tuition + USSD

For implementing **public pay** (student code → year/term → tuition + requirements → MoMo) on **USSD**, read:

**`docs/COMBINED_TUITION_PAY_USSD_GUIDE.md`**

Postman E2E: folder **10c** → **E2E — Combined tuition**.

## Keeping it updated

When new backend routes are added, update:

1. `docs/API_REFERENCE.md` (if present/maintained)
2. `docs/COMBINED_TUITION_PAY_USSD_GUIDE.md` (if USSD flow changes)
3. This Postman collection
