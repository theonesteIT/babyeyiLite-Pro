# Babyeyi Postman Pack

This folder contains a ready-to-import Postman setup for the Babyeyi backend.

## Files

- `BabyeyiSystem.postman_collection.json` — full organized collection of API endpoints
- `BabyeyiSystem.local.postman_environment.json` — local environment variables

## Import steps

1. Open Postman.
2. Click **Import**.
3. Import both JSON files in this folder.
4. Select environment **BabyeyiSystem Local**.
5. Set correct values for:
   - `identifier`
   - `password`
   - `schoolCode` (required for school roles)

## First run order (important)

1. Run `POST /api/auth/login`.
2. Run `GET /api/session/me` to confirm session is active.
3. Run any protected endpoint (example: `GET /api/students`).

> The backend uses session cookie (`babyeyi_sid`), so login must run first in the same Postman session.

## Notes for form-data endpoints

Some endpoints are intentionally created without sample form body because files are required.
In Postman, set **Body -> form-data** and add fields manually.

Common file endpoints:

- `/api/public/schools/register`
- `/api/public/schools/claim`
- `/api/schools`
- `/api/schools/:id/logo`
- `/api/schools/:id/signature`
- `/api/schools/:id/stamp`
- `/api/students/import`
- `/api/babyeyi/upload-asset`
- `/api/district/babyeyi/deo-assets`
- `/api/fee-limits` (regulation PDF)
- `/api/requirement-prices/requirements/:id/image`
- `/api/mini-websites/gallery-images`
- `/api/admissions/forms/:formId/apply` (dynamic fields like `q_1`, `q_2`, ...)

## Keep it updated

When new backend routes are added, update:

1. `docs/API_REFERENCE.md`
2. this Postman collection

